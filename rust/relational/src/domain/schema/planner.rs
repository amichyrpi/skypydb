use std::collections::{BTreeMap, HashMap, HashSet};

use regex::Regex;
use sqlx::MySqlPool;
use tracing::info;
use tracing::instrument;

use crate::repositories::schema_repo::SchemaRepository;
use skypydb_common::schema::signature::{schema_signature, table_signatures};
use skypydb_common::schema::types::{
    FieldDefinition, FieldType, SchemaDocument, TableDefinition, TableMigrationRule,
};
use skypydb_errors::AppError;

/// Result summary returned after a schema apply run.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ApplySchemaResult {
    /// Tables created or updated in the active schema.
    pub managed_tables: Vec<String>,
    /// Tables where migration mapping copied rows from a source table.
    pub migrated_tables: Vec<String>,
    /// Previously managed tables that are now unmanaged.
    pub unmanaged_tables: Vec<String>,
    /// Signature representing the active schema version.
    pub schema_signature: String,
}

/// Validates and applies a schema using a non-destructive migration flow.
#[instrument(skip(pool, schema), fields(table_count = schema.tables.len()))]
pub async fn apply_schema(
    pool: &MySqlPool,
    schema: &SchemaDocument,
) -> Result<ApplySchemaResult, AppError> {
    validate_schema_document(schema)?;

    let repository = SchemaRepository::new(pool.clone());
    let previous_schema = repository.get_active_schema().await?.unwrap_or_default();
    let previous_tables = previous_schema
        .tables
        .keys()
        .cloned()
        .collect::<HashSet<String>>();
    let current_tables = schema.tables.keys().cloned().collect::<HashSet<String>>();
    let per_table_signatures = table_signatures(schema)?;
    let full_signature = schema_signature(schema)?;

    let mut managed_tables = Vec::new();
    let mut migrated_tables = Vec::new();

    let apply_order = resolve_table_apply_order(schema)?;
    for table_name in apply_order {
        let table_definition = schema.tables.get(&table_name).ok_or_else(|| {
            AppError::internal(format!(
                "table '{}' missing from schema during apply order traversal",
                table_name
            ))
        })?;

        repository
            .ensure_relational_table(&table_name, table_definition)
            .await?;
        repository
            .ensure_indexes(&table_name, table_definition)
            .await?;

        if let Some(rule) = schema.migrations.tables.get(&table_name) {
            if let Some(source_table) = &rule.from {
                if source_table != &table_name {
                    let moved_rows = repository
                        .migrate_rows_to_table(source_table, &table_name, table_definition, rule)
                        .await?;
                    if moved_rows > 0 {
                        info!(
                            table = %table_name,
                            source = %source_table,
                            moved_rows,
                            "migrated rows to target table",
                        );
                    }
                    migrated_tables.push(table_name.clone());
                }
            }
        }

        let signature = per_table_signatures
            .get(&table_name)
            .cloned()
            .ok_or_else(|| {
                AppError::internal(format!("missing signature for table '{}'", table_name))
            })?;
        repository
            .upsert_table_meta(&table_name, &signature, true)
            .await?;
        managed_tables.push(table_name);
    }

    let mut unmanaged_tables = Vec::new();
    for removed_table in previous_tables.difference(&current_tables) {
        repository.mark_table_unmanaged(removed_table).await?;
        unmanaged_tables.push(removed_table.clone());
    }

    repository
        .set_active_schema(schema, &full_signature)
        .await?;
    repository
        .log_schema_migration("apply_schema", schema)
        .await?;

    Ok(ApplySchemaResult {
        managed_tables,
        migrated_tables,
        unmanaged_tables,
        schema_signature: full_signature,
    })
}

fn resolve_table_apply_order(schema: &SchemaDocument) -> Result<Vec<String>, AppError> {
    #[derive(Copy, Clone, Eq, PartialEq)]
    enum VisitState {
        Visiting,
        Visited,
    }

    fn visit(
        table_name: &str,
        schema: &SchemaDocument,
        states: &mut HashMap<String, VisitState>,
        ordered: &mut Vec<String>,
    ) -> Result<(), AppError> {
        match states.get(table_name).copied() {
            Some(VisitState::Visited) => return Ok(()),
            Some(VisitState::Visiting) => {
                return Err(AppError::validation(format!(
                    "cyclic foreign-key dependency detected while applying schema at table '{}'",
                    table_name
                )))
            }
            None => {}
        }

        let table_definition = schema.tables.get(table_name).ok_or_else(|| {
            AppError::validation(format!(
                "table '{}' referenced in dependency resolution was not found",
                table_name
            ))
        })?;

        states.insert(table_name.to_string(), VisitState::Visiting);
        for field_definition in table_definition.fields.values() {
            let base = field_definition.unwrap_base();
            if base.field_type != FieldType::Id {
                continue;
            }

            let Some(target_table) = base.table.as_deref() else {
                continue;
            };
            if target_table == table_name {
                continue;
            }
            visit(target_table, schema, states, ordered)?;
        }

        states.insert(table_name.to_string(), VisitState::Visited);
        ordered.push(table_name.to_string());
        Ok(())
    }

    let mut states = HashMap::<String, VisitState>::new();
    let mut ordered = Vec::<String>::new();
    for table_name in schema.tables.keys() {
        visit(table_name, schema, &mut states, &mut ordered)?;
    }
    Ok(ordered)
}

/// Validates schema consistency, foreign-key references, and migration mappings.
pub fn validate_schema_document(schema: &SchemaDocument) -> Result<(), AppError> {
    let table_name_regex = Regex::new(r"^[a-zA-Z][a-zA-Z0-9_]*$")
        .map_err(|error| AppError::internal(format!("failed to build regex: {}", error)))?;

    if schema.tables.is_empty() {
        return Err(AppError::validation(
            "schema must contain at least one table",
        ));
    }

    for (table_name, table_definition) in &schema.tables {
        if !table_name_regex.is_match(table_name) {
            return Err(AppError::validation(format!(
                "invalid table name '{}'",
                table_name
            )));
        }
        validate_table_definition(table_name, table_definition, &schema.tables)?;
    }

    validate_migration_rules(schema)?;
    Ok(())
}

fn validate_table_definition(
    table_name: &str,
    table_definition: &TableDefinition,
    all_tables: &BTreeMap<String, TableDefinition>,
) -> Result<(), AppError> {
    if table_definition.fields.is_empty() {
        return Err(AppError::validation(format!(
            "table '{}' must define at least one field",
            table_name
        )));
    }

    for (field_name, field_definition) in &table_definition.fields {
        validate_field_definition(table_name, field_name, field_definition, all_tables)?;
    }

    for index in &table_definition.indexes {
        if index.name.trim().is_empty() {
            return Err(AppError::validation(format!(
                "table '{}' contains an index with an empty name",
                table_name
            )));
        }
        if index.columns.is_empty() {
            return Err(AppError::validation(format!(
                "index '{}' on table '{}' must include at least one column",
                index.name, table_name
            )));
        }
        for column in &index.columns {
            if !table_definition.fields.contains_key(column) {
                return Err(AppError::validation(format!(
                    "index '{}' on table '{}' references unknown field '{}'",
                    index.name, table_name, column
                )));
            }
        }
    }

    Ok(())
}

fn validate_field_definition(
    table_name: &str,
    field_name: &str,
    field_definition: &FieldDefinition,
    all_tables: &BTreeMap<String, TableDefinition>,
) -> Result<(), AppError> {
    match field_definition.field_type {
        FieldType::Id => {
            let target_table = field_definition.table.as_ref().ok_or_else(|| {
                AppError::validation(format!(
                    "field '{}.{}' with type 'id' must include target table",
                    table_name, field_name
                ))
            })?;
            if !all_tables.contains_key(target_table) {
                return Err(AppError::validation(format!(
                    "field '{}.{}' references unknown table '{}'",
                    table_name, field_name, target_table
                )));
            }
        }
        FieldType::Object => {
            for (nested_name, nested_definition) in &field_definition.shape {
                validate_field_definition(
                    table_name,
                    &format!("{}.{}", field_name, nested_name),
                    nested_definition,
                    all_tables,
                )?;
            }
        }
        FieldType::Optional => {
            let inner = field_definition.inner.as_ref().ok_or_else(|| {
                AppError::validation(format!(
                    "field '{}.{}' optional type requires an 'inner' field definition",
                    table_name, field_name
                ))
            })?;
            validate_field_definition(table_name, field_name, inner.as_ref(), all_tables)?;
        }
        FieldType::String | FieldType::Number | FieldType::Boolean => {}
    }
    Ok(())
}

fn validate_migration_rules(schema: &SchemaDocument) -> Result<(), AppError> {
    let mut source_to_target = HashMap::<String, String>::new();

    for (target_table, rule) in &schema.migrations.tables {
        if !schema.tables.contains_key(target_table) {
            return Err(AppError::validation(format!(
                "migration rule references unknown target table '{}'",
                target_table
            )));
        }
        if let Some(source_table) = &rule.from {
            if source_table == target_table {
                return Err(AppError::validation(format!(
                    "migration from '{}' to '{}' is invalid (same table)",
                    source_table, target_table
                )));
            }
            if let Some(existing_target) = source_to_target.get(source_table) {
                return Err(AppError::validation(format!(
                    "source table '{}' cannot map to both '{}' and '{}'",
                    source_table, existing_target, target_table
                )));
            }
            source_to_target.insert(source_table.clone(), target_table.clone());
        }

        validate_migration_fields(target_table, rule, schema)?;
    }

    Ok(())
}

fn validate_migration_fields(
    target_table: &str,
    rule: &TableMigrationRule,
    schema: &SchemaDocument,
) -> Result<(), AppError> {
    let table = schema.tables.get(target_table).ok_or_else(|| {
        AppError::validation(format!(
            "unknown target table '{}' in migration rules",
            target_table
        ))
    })?;

    for target_field in rule.field_map.keys() {
        if !table.fields.contains_key(target_field) {
            return Err(AppError::validation(format!(
                "migration fieldMap for '{}' references unknown target field '{}'",
                target_table, target_field
            )));
        }
    }

    for target_field in rule.defaults.keys() {
        if !table.fields.contains_key(target_field) {
            return Err(AppError::validation(format!(
                "migration defaults for '{}' references unknown target field '{}'",
                target_table, target_field
            )));
        }
    }

    Ok(())
}

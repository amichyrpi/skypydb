use chrono::Utc;
use regex::Regex;
use serde_json::{Map, Value};
use sqlx::mysql::MySqlRow;
use sqlx::{Column, MySqlPool, Row};

use crate::domain::relational::query_planner::map_row_to_target_payload;
use skypydb_common::schema::types::{
    FieldDefinition, FieldType, SchemaDocument, TableDefinition, TableMigrationRule,
};
use skypydb_errors::AppError;

/// Repository that manages schema metadata and dynamic table DDL operations.
#[derive(Clone)]
pub struct SchemaRepository {
    pool: MySqlPool,
}

impl SchemaRepository {
    /// Creates a new schema repository.
    pub fn new(pool: MySqlPool) -> Self {
        Self { pool }
    }

    /// Reads the active schema from `_skypydb_schema_state`.
    pub async fn get_active_schema(&self) -> Result<Option<SchemaDocument>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT value_json
            FROM _skypydb_schema_state
            WHERE key_name = 'active_schema'
            "#,
        )
        .fetch_optional(&self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let schema_json = row
            .try_get::<sqlx::types::Json<Value>, _>("value_json")
            .map_err(|error| {
                AppError::Database(format!("failed to parse active_schema json: {}", error))
            })?;
        let schema = serde_json::from_value::<SchemaDocument>(schema_json.0).map_err(|error| {
            AppError::Database(format!(
                "failed to deserialize active_schema from state table: {}",
                error
            ))
        })?;
        Ok(Some(schema))
    }

    /// Reads the active schema signature.
    pub async fn get_active_schema_signature(&self) -> Result<Option<String>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT value_json
            FROM _skypydb_schema_state
            WHERE key_name = 'active_schema_signature'
            "#,
        )
        .fetch_optional(&self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let signature_json = row
            .try_get::<sqlx::types::Json<Value>, _>("value_json")
            .map_err(|error| {
                AppError::Database(format!("failed to parse signature json: {}", error))
            })?;
        let signature = signature_json
            .0
            .as_str()
            .ok_or_else(|| {
                AppError::Database("active schema signature is not a string".to_string())
            })?
            .to_string();
        Ok(Some(signature))
    }

    /// Writes the active schema and signature into state table.
    pub async fn set_active_schema(
        &self,
        schema: &SchemaDocument,
        signature: &str,
    ) -> Result<(), AppError> {
        let schema_json = serde_json::to_value(schema).map_err(|error| {
            AppError::validation(format!("failed to serialize schema: {}", error))
        })?;

        sqlx::query(
            r#"
            INSERT INTO _skypydb_schema_state (key_name, value_json)
            VALUES ('active_schema', ?)
            ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)
            "#,
        )
        .bind(sqlx::types::Json(schema_json))
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO _skypydb_schema_state (key_name, value_json)
            VALUES ('active_schema_signature', ?)
            ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)
            "#,
        )
        .bind(sqlx::types::Json(Value::String(signature.to_string())))
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Upserts signature metadata for one managed/unmanaged table.
    pub async fn upsert_table_meta(
        &self,
        table_name: &str,
        signature: &str,
        managed: bool,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO _skypydb_schema_meta (table_name, signature, managed)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                signature = VALUES(signature),
                managed = VALUES(managed)
            "#,
        )
        .bind(table_name)
        .bind(signature)
        .bind(managed)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Marks a table as unmanaged in schema metadata, while keeping physical data intact.
    pub async fn mark_table_unmanaged(&self, table_name: &str) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO _skypydb_schema_meta (table_name, signature, managed)
            VALUES (?, '', FALSE)
            ON DUPLICATE KEY UPDATE managed = FALSE
            "#,
        )
        .bind(table_name)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Appends a migration event record to `_skypydb_schema_migrations`.
    pub async fn log_schema_migration(
        &self,
        migration_name: &str,
        details: &SchemaDocument,
    ) -> Result<(), AppError> {
        let details_json = serde_json::to_value(details).map_err(|error| {
            AppError::validation(format!("failed to serialize migration details: {}", error))
        })?;

        sqlx::query(
            r#"
            INSERT INTO _skypydb_schema_migrations (migration_name, details)
            VALUES (?, ?)
            "#,
        )
        .bind(migration_name)
        .bind(sqlx::types::Json(details_json))
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Creates the managed table when missing and adds missing fields/indexes non-destructively.
    pub async fn ensure_relational_table(
        &self,
        table_name: &str,
        definition: &TableDefinition,
    ) -> Result<(), AppError> {
        validate_sql_identifier(table_name)?;
        if !self.table_exists(table_name).await? {
            self.create_relational_table(table_name, definition).await?;
        }
        self.ensure_columns(table_name, definition).await?;
        Ok(())
    }

    /// Ensures defined indexes exist for the provided table.
    pub async fn ensure_indexes(
        &self,
        table_name: &str,
        definition: &TableDefinition,
    ) -> Result<(), AppError> {
        validate_sql_identifier(table_name)?;
        for index in &definition.indexes {
            validate_sql_identifier(&index.name)?;
            if self.index_exists(table_name, &index.name).await? {
                continue;
            }
            let columns = index
                .columns
                .iter()
                .map(|column| {
                    let field_definition = definition.fields.get(column).ok_or_else(|| {
                        AppError::validation(format!(
                            "index '{}' on table '{}' references unknown field '{}'",
                            index.name, table_name, column
                        ))
                    })?;
                    index_column_sql(column, field_definition)
                })
                .collect::<Result<Vec<String>, AppError>>()?
                .join(", ");
            let sql = format!(
                "CREATE INDEX `{}` ON `{}` ({})",
                index.name, table_name, columns
            );
            sqlx::query(&sql).execute(&self.pool).await?;
        }
        Ok(())
    }

    /// Copies rows from `source_table` into `target_table` using migration mapping rules.
    pub async fn migrate_rows_to_table(
        &self,
        source_table: &str,
        target_table: &str,
        target_definition: &TableDefinition,
        rule: &TableMigrationRule,
    ) -> Result<u64, AppError> {
        validate_sql_identifier(source_table)?;
        validate_sql_identifier(target_table)?;
        if !self.table_exists(source_table).await? {
            return Ok(0);
        }
        if !self.table_exists(target_table).await? {
            return Ok(0);
        }

        let fetch_sql = format!("SELECT * FROM `{}`", source_table);
        let rows = sqlx::query(&fetch_sql).fetch_all(&self.pool).await?;
        if rows.is_empty() {
            return Ok(0);
        }

        let mut moved_count = 0_u64;
        let mut transaction = self.pool.begin().await?;
        for row in rows {
            let source_map = row_to_json_map(&row)?;
            let mut payload = map_row_to_target_payload(
                &source_map,
                target_definition,
                &rule.field_map,
                &rule.defaults,
            )?;
            let id = source_map
                .get("_id")
                .and_then(Value::as_str)
                .ok_or_else(|| AppError::validation("migration source row missing _id"))?
                .to_string();
            let created_at = source_map
                .get("_created_at")
                .cloned()
                .unwrap_or_else(|| Value::String(Utc::now().naive_utc().to_string()));

            let extras = source_map
                .get("_extras")
                .cloned()
                .unwrap_or_else(|| Value::Object(Map::new()));

            payload.insert("_id".to_string(), Value::String(id));
            payload.insert("_created_at".to_string(), created_at);
            payload.insert(
                "_updated_at".to_string(),
                Value::String(Utc::now().naive_utc().to_string()),
            );
            payload.insert("_extras".to_string(), extras);

            insert_migrated_row(&mut transaction, target_table, &payload).await?;
            moved_count += 1;
        }

        transaction.commit().await?;
        Ok(moved_count)
    }

    async fn create_relational_table(
        &self,
        table_name: &str,
        definition: &TableDefinition,
    ) -> Result<(), AppError> {
        let mut columns = vec![
            "`_id` CHAR(36) PRIMARY KEY".to_string(),
            "`_created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)".to_string(),
            "`_updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"
                .to_string(),
            "`_extras` JSON NULL".to_string(),
        ];
        let mut constraints = Vec::<String>::new();

        for (field_name, field_definition) in &definition.fields {
            validate_sql_identifier(field_name)?;
            columns.push(format!(
                "`{}` {}",
                field_name,
                column_type_sql(field_definition)?
            ));

            let base = field_definition.unwrap_base();
            if base.field_type == FieldType::Id {
                let target_table = base.table.as_ref().ok_or_else(|| {
                    AppError::validation(format!(
                        "id field '{}.{}' is missing target table",
                        table_name, field_name
                    ))
                })?;
                validate_sql_identifier(target_table)?;
                let constraint_name = format!("fk_{}_{}", table_name, field_name);
                constraints.push(format!(
                    "CONSTRAINT `{}` FOREIGN KEY (`{}`) REFERENCES `{}`(`_id`) ON DELETE RESTRICT",
                    constraint_name, field_name, target_table
                ));
            }
        }

        let mut definitions = columns;
        definitions.extend(constraints);
        let sql = format!(
            "CREATE TABLE IF NOT EXISTS `{}` ({})",
            table_name,
            definitions.join(", ")
        );
        sqlx::query(&sql).execute(&self.pool).await?;
        Ok(())
    }

    async fn ensure_columns(
        &self,
        table_name: &str,
        definition: &TableDefinition,
    ) -> Result<(), AppError> {
        for (field_name, field_definition) in &definition.fields {
            if self.column_exists(table_name, field_name).await? {
                continue;
            }
            let base_type = column_type_sql(field_definition.unwrap_base())?;
            let alter_sql = format!(
                "ALTER TABLE `{}` ADD COLUMN `{}` {}",
                table_name, field_name, base_type
            );
            sqlx::query(&alter_sql).execute(&self.pool).await?;
        }
        Ok(())
    }

    async fn table_exists(&self, table_name: &str) -> Result<bool, AppError> {
        let count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(1)
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = ?
            "#,
        )
        .bind(table_name)
        .fetch_one(&self.pool)
        .await?;
        Ok(count > 0)
    }

    async fn column_exists(&self, table_name: &str, column_name: &str) -> Result<bool, AppError> {
        let count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(1)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = ?
              AND column_name = ?
            "#,
        )
        .bind(table_name)
        .bind(column_name)
        .fetch_one(&self.pool)
        .await?;
        Ok(count > 0)
    }

    async fn index_exists(&self, table_name: &str, index_name: &str) -> Result<bool, AppError> {
        let count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(1)
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = ?
              AND index_name = ?
            "#,
        )
        .bind(table_name)
        .bind(index_name)
        .fetch_one(&self.pool)
        .await?;
        Ok(count > 0)
    }
}

fn validate_sql_identifier(identifier: &str) -> Result<(), AppError> {
    let regex = Regex::new(r"^[a-zA-Z][a-zA-Z0-9_]*$").map_err(|error| {
        AppError::internal(format!("failed to build identifier regex: {}", error))
    })?;
    if !regex.is_match(identifier) {
        return Err(AppError::validation(format!(
            "invalid SQL identifier '{}'",
            identifier
        )));
    }
    Ok(())
}

fn column_type_sql(field_definition: &FieldDefinition) -> Result<String, AppError> {
    let (base_definition, optional) = if field_definition.field_type == FieldType::Optional {
        let inner = field_definition
            .inner
            .as_ref()
            .ok_or_else(|| AppError::validation("optional field requires inner definition"))?;
        (inner.as_ref(), true)
    } else {
        (field_definition, false)
    };

    let sql_type = match base_definition.field_type {
        FieldType::String => "TEXT".to_string(),
        FieldType::Number => "DOUBLE".to_string(),
        FieldType::Boolean => "TINYINT(1)".to_string(),
        FieldType::Id => "CHAR(36)".to_string(),
        FieldType::Object => "JSON".to_string(),
        FieldType::Optional => {
            return Err(AppError::validation(
                "nested optional field definitions are not supported",
            ))
        }
    };

    let nullability = if optional { "NULL" } else { "NOT NULL" };
    Ok(format!("{} {}", sql_type, nullability))
}

fn index_column_sql(
    field_name: &str,
    field_definition: &FieldDefinition,
) -> Result<String, AppError> {
    let base_definition = field_definition.unwrap_base();
    match base_definition.field_type {
        // MySQL requires a prefix length for TEXT indexes. 191 is safe for utf8mb4.
        FieldType::String => Ok(format!("`{}`(191)", field_name)),
        FieldType::Object => Err(AppError::validation(format!(
            "field '{}' has type 'object' and cannot be directly indexed",
            field_name
        ))),
        FieldType::Optional => Err(AppError::validation(format!(
            "field '{}' has unresolved optional type for index creation",
            field_name
        ))),
        FieldType::Number | FieldType::Boolean | FieldType::Id => Ok(format!("`{}`", field_name)),
    }
}

fn row_to_json_map(row: &MySqlRow) -> Result<Map<String, Value>, AppError> {
    let mut map = Map::<String, Value>::new();
    for column in row.columns() {
        let column_name = column.name();

        if let Ok(value) = row.try_get::<Option<sqlx::types::Json<Value>>, _>(column_name) {
            if let Some(json_value) = value {
                map.insert(column_name.to_string(), json_value.0);
                continue;
            }
            map.insert(column_name.to_string(), Value::Null);
            continue;
        }
        if let Ok(value) = row.try_get::<Option<String>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value.map(Value::String).unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<f64>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .and_then(serde_json::Number::from_f64)
                    .map(Value::Number)
                    .unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<i64>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(serde_json::Number::from)
                    .map(Value::Number)
                    .unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<i8>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(|next| Value::Bool(next != 0))
                    .unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<chrono::NaiveDateTime>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(|next| Value::String(next.to_string()))
                    .unwrap_or(Value::Null),
            );
            continue;
        }
    }
    Ok(map)
}

async fn insert_migrated_row(
    transaction: &mut sqlx::Transaction<'_, sqlx::MySql>,
    table_name: &str,
    payload: &Map<String, Value>,
) -> Result<(), AppError> {
    let mut columns = payload.keys().cloned().collect::<Vec<String>>();
    columns.sort();

    let placeholders = std::iter::repeat_n("?", columns.len())
        .collect::<Vec<&str>>()
        .join(", ");
    let column_sql = columns
        .iter()
        .map(|column| format!("`{}`", column))
        .collect::<Vec<String>>()
        .join(", ");
    let sql = format!(
        "INSERT INTO `{}` ({}) VALUES ({})",
        table_name, column_sql, placeholders
    );

    let mut query = sqlx::query(&sql);
    for column in &columns {
        let value = payload.get(column).ok_or_else(|| {
            AppError::internal(format!(
                "migration payload missing expected column '{}'",
                column
            ))
        })?;
        query = bind_json_value(query, value)?;
    }
    query.execute(&mut **transaction).await?;
    Ok(())
}

fn bind_json_value<'q>(
    query: sqlx::query::Query<'q, sqlx::MySql, sqlx::mysql::MySqlArguments>,
    value: &Value,
) -> Result<sqlx::query::Query<'q, sqlx::MySql, sqlx::mysql::MySqlArguments>, AppError> {
    let next = match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(boolean) => query.bind(*boolean),
        Value::Number(number) => {
            if let Some(int_value) = number.as_i64() {
                query.bind(int_value)
            } else if let Some(float_value) = number.as_f64() {
                query.bind(float_value)
            } else {
                return Err(AppError::validation("invalid numeric value in payload"));
            }
        }
        Value::String(text) => query.bind(text.to_string()),
        Value::Array(_) | Value::Object(_) => query.bind(sqlx::types::Json(value.clone())),
    };
    Ok(next)
}

use std::collections::{BTreeMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::domain::relational::validator::validate_identifier;
use skypydb_common::schema::types::TableDefinition;
use skypydb_errors::AppError;

/// Sort descriptor used by relational query planning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderByClause {
    /// Field name to sort by.
    pub field: String,
    /// Optional direction (`asc` or `desc`).
    #[serde(default)]
    pub direction: Option<String>,
}

/// Converts query sort clauses into a SQL `ORDER BY` expression.
pub fn compile_order_by(
    order_by: Option<&[OrderByClause]>,
    allowed_fields: &HashSet<String>,
) -> Result<Option<String>, AppError> {
    let Some(entries) = order_by else {
        return Ok(None);
    };
    if entries.is_empty() {
        return Ok(None);
    }

    let mut parts = Vec::<String>::new();
    for entry in entries {
        if !allowed_fields.contains(&entry.field) {
            return Err(AppError::validation(format!(
                "unknown orderBy field '{}'",
                entry.field
            )));
        }
        validate_identifier(&entry.field)?;
        let direction = entry
            .direction
            .as_deref()
            .unwrap_or("asc")
            .to_ascii_lowercase();
        let sql_direction = match direction.as_str() {
            "asc" => "ASC",
            "desc" => "DESC",
            _ => {
                return Err(AppError::validation(format!(
                    "invalid sort direction '{}' for field '{}'",
                    direction, entry.field
                )))
            }
        };
        parts.push(format!("`{}` {}", entry.field, sql_direction));
    }

    Ok(Some(parts.join(", ")))
}

/// Maps a source row into a target payload for table move/migration operations.
pub fn map_row_to_target_payload(
    source_row: &Map<String, Value>,
    target_definition: &TableDefinition,
    field_map: &BTreeMap<String, String>,
    defaults: &BTreeMap<String, Value>,
) -> Result<Map<String, Value>, AppError> {
    let mut payload = Map::new();

    for (target_field, field_definition) in &target_definition.fields {
        let mapped_source_key = field_map.get(target_field).unwrap_or(target_field);
        if let Some(value) = source_row.get(mapped_source_key) {
            payload.insert(target_field.clone(), value.clone());
            continue;
        }
        if let Some(default_value) = defaults.get(target_field) {
            payload.insert(target_field.clone(), default_value.clone());
            continue;
        }

        if field_definition.is_optional() {
            payload.insert(target_field.clone(), Value::Null);
            continue;
        }

        return Err(AppError::validation(format!(
            "cannot map source row: missing required target field '{}'",
            target_field
        )));
    }

    Ok(payload)
}

use std::collections::BTreeMap;
use std::hash::{Hash, Hasher};

use serde_json::Value;

use crate::schema::types::{SchemaDocument, TableDefinition};
use skypydb_errors::AppError;

/// Returns a deterministic schema signature string for migration comparison.
pub fn schema_signature(schema: &SchemaDocument) -> Result<String, AppError> {
    let canonical = canonical_schema_json(schema)?;
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    canonical.hash(&mut hasher);
    Ok(format!("{:016x}", hasher.finish()))
}

/// Returns per-table signature hashes.
pub fn table_signatures(schema: &SchemaDocument) -> Result<BTreeMap<String, String>, AppError> {
    let mut signatures = BTreeMap::new();
    for (table_name, table_definition) in &schema.tables {
        signatures.insert(
            table_name.clone(),
            table_signature(table_definition).map_err(|error| {
                AppError::validation(format!(
                    "failed to compute signature for table '{}': {}",
                    table_name, error
                ))
            })?,
        );
    }
    Ok(signatures)
}

fn table_signature(table: &TableDefinition) -> Result<String, serde_json::Error> {
    let canonical = serde_json::to_string(table)?;
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    canonical.hash(&mut hasher);
    Ok(format!("{:016x}", hasher.finish()))
}

fn canonical_schema_json(schema: &SchemaDocument) -> Result<String, AppError> {
    let value = serde_json::to_value(schema)
        .map_err(|error| AppError::validation(format!("invalid schema json: {}", error)))?;
    canonicalize_value(&value)
}

fn canonicalize_value(value: &Value) -> Result<String, AppError> {
    match value {
        Value::Object(map) => {
            let mut ordered_entries = map
                .iter()
                .map(|(key, next)| {
                    canonicalize_value(next).map(|canonical| format!("\"{}\":{}", key, canonical))
                })
                .collect::<Result<Vec<String>, AppError>>()?;
            ordered_entries.sort();
            Ok(format!("{{{}}}", ordered_entries.join(",")))
        }
        Value::Array(items) => {
            let canonical_items = items
                .iter()
                .map(canonicalize_value)
                .collect::<Result<Vec<String>, AppError>>()?;
            Ok(format!("[{}]", canonical_items.join(",")))
        }
        _ => serde_json::to_string(value)
            .map_err(|error| AppError::validation(format!("invalid scalar value: {}", error))),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::schema::signature::schema_signature;
    use crate::schema::types::{
        FieldDefinition, FieldType, SchemaDocument, TableDefinition, TableIndexDefinition,
    };

    fn string_field() -> FieldDefinition {
        FieldDefinition {
            field_type: FieldType::String,
            table: None,
            shape: BTreeMap::new(),
            inner: None,
        }
    }

    #[test]
    fn schema_hash_is_deterministic() {
        let mut fields_a = BTreeMap::new();
        fields_a.insert("name".to_string(), string_field());
        fields_a.insert("email".to_string(), string_field());

        let mut fields_b = BTreeMap::new();
        fields_b.insert("email".to_string(), string_field());
        fields_b.insert("name".to_string(), string_field());

        let mut tables_a = BTreeMap::new();
        tables_a.insert(
            "users".to_string(),
            TableDefinition {
                fields: fields_a,
                indexes: vec![TableIndexDefinition {
                    name: "by_email".to_string(),
                    columns: vec!["email".to_string()],
                }],
            },
        );

        let mut tables_b = BTreeMap::new();
        tables_b.insert(
            "users".to_string(),
            TableDefinition {
                fields: fields_b,
                indexes: vec![TableIndexDefinition {
                    name: "by_email".to_string(),
                    columns: vec!["email".to_string()],
                }],
            },
        );

        let schema_a = SchemaDocument {
            tables: tables_a,
            ..SchemaDocument::default()
        };
        let schema_b = SchemaDocument {
            tables: tables_b,
            ..SchemaDocument::default()
        };

        let hash_a = schema_signature(&schema_a).expect("hash a");
        let hash_b = schema_signature(&schema_b).expect("hash b");
        assert_eq!(hash_a, hash_b);
    }
}

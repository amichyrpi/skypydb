use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Top-level schema payload applied by `/v1/admin/schema/apply`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SchemaDocument {
    /// Managed tables keyed by table name.
    pub tables: BTreeMap<String, TableDefinition>,
    /// Optional migration mapping rules for non-destructive moves.
    #[serde(default)]
    pub migrations: SchemaMigrations,
}

/// Table definition used by the schema runtime.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableDefinition {
    /// Table field definitions.
    pub fields: BTreeMap<String, FieldDefinition>,
    /// Optional index definitions.
    #[serde(default)]
    pub indexes: Vec<TableIndexDefinition>,
}

/// Supported schema field types.
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
    String,
    Number,
    Boolean,
    Id,
    Object,
    Optional,
}

/// Field definition with type metadata and optional nesting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    /// Field type descriptor.
    #[serde(rename = "type")]
    pub field_type: FieldType,
    /// Optional foreign-key target table for `id` fields.
    #[serde(default)]
    pub table: Option<String>,
    /// Nested field shape for `object` fields.
    #[serde(default)]
    pub shape: BTreeMap<String, FieldDefinition>,
    /// Wrapped inner type for `optional` fields.
    #[serde(default)]
    pub inner: Option<Box<FieldDefinition>>,
}

impl FieldDefinition {
    /// Returns true when this field (or wrapper) allows null values.
    pub fn is_optional(&self) -> bool {
        self.field_type == FieldType::Optional
    }

    /// Returns the effective non-optional field definition.
    pub fn unwrap_base(&self) -> &FieldDefinition {
        if self.field_type == FieldType::Optional {
            if let Some(inner) = &self.inner {
                return inner.as_ref();
            }
        }
        self
    }
}

/// Table index descriptor.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableIndexDefinition {
    /// Index name.
    pub name: String,
    /// Ordered indexed column names.
    pub columns: Vec<String>,
}

/// Migration options scoped by target table.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SchemaMigrations {
    /// Target-table migration rules.
    #[serde(default)]
    pub tables: BTreeMap<String, TableMigrationRule>,
}

/// Rule for moving/adapting rows from an old table into a target table.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TableMigrationRule {
    /// Optional source table name.
    #[serde(default)]
    pub from: Option<String>,
    /// Mapping of target field -> source field.
    #[serde(default)]
    pub field_map: BTreeMap<String, String>,
    /// Literal defaults for unmapped required fields.
    #[serde(default)]
    pub defaults: BTreeMap<String, Value>,
}

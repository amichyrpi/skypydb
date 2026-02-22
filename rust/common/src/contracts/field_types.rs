use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// Supported field types for runtime function arguments.
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
#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
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
    ///
    /// # Panics
    /// Panics if `field_type` is `Optional` but `inner` is `None`.
    pub fn unwrap_base(&self) -> &FieldDefinition {
        if self.field_type == FieldType::Optional {
            return self
                .inner
                .as_ref()
                .expect("Optional field must have an inner type")
                .as_ref();
        }
        self
    }
}

use serde::{Deserialize, Serialize};

use skypydb_common::schema::types::SchemaDocument;

/// Request payload for schema apply endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaApplyRequest {
    /// Full schema document to become active.
    pub schema: SchemaDocument,
}

/// Request payload for schema validation endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaValidateRequest {
    /// Candidate schema document to validate.
    pub schema: SchemaDocument,
}

/// Response payload for schema read endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaReadResponse {
    /// Currently active schema, if one has been applied.
    pub schema: Option<SchemaDocument>,
    /// Active schema signature hash.
    pub schema_signature: Option<String>,
}

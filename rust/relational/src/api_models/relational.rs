use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Relational insert request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsertRequest {
    /// Row payload to insert.
    pub value: Value,
}

/// Relational full-replace update request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRequest {
    /// Optional single-row selector.
    #[serde(default)]
    pub id: Option<String>,
    /// Optional where-clause selector (XOR with `id`).
    #[serde(default, rename = "where")]
    pub where_clause: Option<Value>,
    /// Replacement row payload.
    pub value: Value,
}

/// Relational delete request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteRequest {
    /// Optional single-row selector.
    #[serde(default)]
    pub id: Option<String>,
    /// Optional where-clause selector (XOR with `id`).
    #[serde(default, rename = "where")]
    pub where_clause: Option<Value>,
}

/// Relational move request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveRequest {
    /// Target table receiving moved rows.
    pub to_table: String,
    /// Optional single-row selector.
    #[serde(default)]
    pub id: Option<String>,
    /// Optional where-clause selector (XOR with `id`).
    #[serde(default, rename = "where")]
    pub where_clause: Option<Value>,
    /// Mapping of target field -> source field.
    #[serde(default)]
    pub field_map: BTreeMap<String, String>,
    /// Literal defaults for unmapped target fields.
    #[serde(default)]
    pub defaults: BTreeMap<String, Value>,
}

/// Relational sort clause descriptor.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderByClause {
    /// Sort field.
    pub field: String,
    /// Sort direction (`asc` or `desc`).
    #[serde(default)]
    pub direction: Option<String>,
}

/// Relational query request body.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct QueryRequest {
    /// Optional where clause.
    #[serde(default, rename = "where")]
    pub where_clause: Option<Value>,
    /// Optional order-by clauses.
    #[serde(default)]
    pub order_by: Vec<OrderByClause>,
    /// Optional pagination limit.
    #[serde(default)]
    pub limit: Option<u32>,
    /// Optional pagination offset.
    #[serde(default)]
    pub offset: Option<u32>,
}

/// Relational count request body.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CountRequest {
    /// Optional where clause.
    #[serde(default, rename = "where")]
    pub where_clause: Option<Value>,
}

/// Generic affected-row count response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AffectedRowsResponse {
    /// Number of rows affected by write operation.
    pub affected_rows: u64,
}

/// Insert response body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsertResponse {
    /// Inserted row id.
    pub id: String,
}

/// Query response body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRowsResponse {
    /// Returned rows.
    pub rows: Vec<Value>,
}

/// Count response body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountResponse {
    /// Number of rows matched by filter.
    pub count: u64,
}

/// First response body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirstResponse {
    /// First row matched by query, if any.
    pub row: Option<Value>,
}

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
    #[serde(alias = "toTable")]
    pub to_table: String,
    /// Optional single-row selector.
    #[serde(default)]
    pub id: Option<String>,
    /// Optional where-clause selector (XOR with `id`).
    #[serde(default, rename = "where")]
    pub where_clause: Option<Value>,
    /// Mapping of target field -> source field.
    #[serde(default, alias = "fieldMap")]
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
    #[serde(default, alias = "orderBy")]
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

#[cfg(test)]
mod tests {
    use super::{MoveRequest, QueryRequest};
    use serde_json::json;

    #[test]
    fn move_request_accepts_camel_case_aliases() {
        let request: MoveRequest = serde_json::from_value(json!({
            "toTable": "tasks_archive",
            "fieldMap": { "title": "name" },
            "defaults": { "completed": false },
            "where": { "_id": { "$eq": "abc" } }
        }))
        .expect("move request should deserialize");

        assert_eq!(request.to_table, "tasks_archive");
        assert_eq!(
            request.field_map.get("title").expect("field_map value"),
            "name"
        );
    }

    #[test]
    fn query_request_accepts_order_by_alias() {
        let request: QueryRequest = serde_json::from_value(json!({
            "orderBy": [{ "field": "name", "direction": "asc" }],
            "limit": 10
        }))
        .expect("query request should deserialize");

        assert_eq!(request.order_by.len(), 1);
        assert_eq!(request.order_by[0].field, "name");
        assert_eq!(request.order_by[0].direction.as_deref(), Some("asc"));
    }
}

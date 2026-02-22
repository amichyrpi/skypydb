use axum::Json;
use serde_json::{json, Value};

/// Returns a lightweight OpenAPI document for backend discovery.
pub async fn openapi_json() -> Json<Value> {
    Json(json!({
        "openapi": "3.0.3",
        "info": {
            "title": "Skypydb Rust Backend API",
            "version": "1.0.0",
            "description": "REST API for relational and vector operations on MySQL."
        },
        "servers": [
            {"url": "http://localhost:8000"}
        ],
        "components": {
            "securitySchemes": {
                "ApiKeyAuth": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-API-Key"
                }
            }
        },
        "security": [{"ApiKeyAuth": []}],
        "paths": {
            "/healthz": {"get": {"summary": "Health check"}},
            "/readyz": {"get": {"summary": "Readiness check"}},
            "/v1/functions/call": {"post": {"summary": "Execute a runtime function"}},
            "/v1/vector/collections": {"post": {"summary": "Create vector collection"}, "get": {"summary": "List vector collections"}},
            "/v1/vector/collections/{name}": {"delete": {"summary": "Delete vector collection"}},
            "/v1/vector/collections/{name}/items/add": {"post": {"summary": "Add vector items"}},
            "/v1/vector/collections/{name}/items/update": {"post": {"summary": "Update vector items"}},
            "/v1/vector/collections/{name}/items/delete": {"post": {"summary": "Delete vector items"}},
            "/v1/vector/collections/{name}/items/get": {"post": {"summary": "Get vector items"}},
            "/v1/vector/collections/{name}/query": {"post": {"summary": "Query vector items"}}
        }
    }))
}

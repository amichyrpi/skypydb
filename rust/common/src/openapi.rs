use axum::Json;
use serde_json::{json, Value};

/// Returns a lightweight OpenAPI document for backend discovery.
pub async fn openapi_json() -> Json<Value> {
    Json(json!({
        "openapi": "3.0.3",
        "info": {
            "title": "Mesosphere Rust Backend API",
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
            "/v1/functions/stream": {"get": {"summary": "Stream function call events (SSE)"}},
            "/v1/functions/call": {"post": {"summary": "Execute a runtime function"}},
            "/v1/functions/deploy": {"post": {"summary": "Deploy TypeScript functions manifest (local/cloud)"}},
            "/v1/storage/upload": {"post": {"summary": "Upload binary file content with one-time token header", "parameters": [{"name": "X-Upload-Token", "description": "One-time upload token from `ctx.storage.createUploadUrl()` / `ctx.storage.generateUploadUrl()`. Tokens are single-use and expire shortly after issuance.", "in": "header", "required": true, "schema": {"type": "string", "format": "uuid"}}]}},
            "/v1/storage/files/{storage_id}": {"get": {"summary": "Fetch uploaded file bytes by storage id"}},
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

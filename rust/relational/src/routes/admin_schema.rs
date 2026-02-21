use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};

use crate::api_models::schema::{SchemaApplyRequest, SchemaReadResponse, SchemaValidateRequest};
use crate::domain::schema::planner::{apply_schema, validate_schema_document};
use crate::repositories::schema_repo::SchemaRepository;
use skypydb_application::state::AppState;
use skypydb_common::api::envelope::{ApiEnvelope, ApiMessage};
use skypydb_errors::AppError;

/// Registers schema admin endpoints.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin/schema", get(get_schema))
        .route("/admin/schema/apply", post(apply_schema_handler))
        .route("/admin/schema/validate", post(validate_schema_handler))
}

async fn apply_schema_handler(
    State(state): State<AppState>,
    Json(request): Json<SchemaApplyRequest>,
) -> Result<Json<ApiEnvelope<crate::domain::schema::planner::ApplySchemaResult>>, AppError> {
    let result = apply_schema(&state.pool, &request.schema).await?;
    Ok(Json(ApiEnvelope::ok(result)))
}

async fn validate_schema_handler(
    Json(request): Json<SchemaValidateRequest>,
) -> Result<Json<ApiEnvelope<ApiMessage>>, AppError> {
    validate_schema_document(&request.schema)?;
    Ok(Json(ApiEnvelope::ok(ApiMessage {
        message: "schema is valid".to_string(),
    })))
}

async fn get_schema(
    State(state): State<AppState>,
) -> Result<Json<ApiEnvelope<SchemaReadResponse>>, AppError> {
    let repository = SchemaRepository::new(state.pool.clone());
    let schema = repository.get_active_schema().await?;
    let signature = repository.get_active_schema_signature().await?;
    Ok(Json(ApiEnvelope::ok(SchemaReadResponse {
        schema,
        schema_signature: signature,
    })))
}

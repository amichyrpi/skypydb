use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};

use crate::api_models::functions::{FunctionCallRequest, FunctionCallResponse};
use crate::functions::executor::{ensure_runtime_tables, execute_manifest_function};
use crate::functions::manifest::load_functions_from_source;
use skypydb_application::state::AppState;
use skypydb_common::api::envelope::ApiEnvelope;
use skypydb_errors::AppError;

/// Registers function execution endpoints.
pub fn router() -> Router<AppState> {
    Router::new().route("/functions/call", post(call_function))
}

async fn call_function(
    State(state): State<AppState>,
    Json(request): Json<FunctionCallRequest>,
) -> Result<Json<ApiEnvelope<FunctionCallResponse>>, AppError> {
    let endpoint = request.endpoint.trim().to_string();
    if endpoint.is_empty() {
        return Err(AppError::validation(
            "function endpoint must be a non-empty string",
        ));
    }

    let source_dir = std::path::Path::new(&state.config.functions_source_dir);
    let manifest = load_functions_from_source(source_dir)?;
    if !manifest.functions.contains_key(&endpoint) {
        return Err(AppError::not_found(format!(
            "function endpoint '{}' not found in source directory '{}'",
            endpoint,
            source_dir.display()
        )));
    }
    ensure_runtime_tables(&state.pool, state.config.query_max_limit, &manifest).await?;

    let args = request.args_object()?;
    let result = execute_manifest_function(
        &state.pool,
        state.config.query_max_limit,
        &manifest,
        &endpoint,
        args,
    )
    .await?;
    Ok(Json(ApiEnvelope::ok(FunctionCallResponse { result })))
}

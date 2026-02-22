use std::path::Path;

use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};

use crate::api_models::functions::{FunctionCallRequest, FunctionCallResponse};
use crate::functions::executor::execute_manifest_function;
use crate::functions::manifest::load_manifest;
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

    let manifest_path = Path::new(&state.config.functions_manifest_path);
    let manifest = load_manifest(manifest_path)?;
    let Some(manifest) = manifest else {
        return Err(AppError::not_found(format!(
            "function manifest not found at '{}'; run `skypydb functions build`",
            manifest_path.display()
        )));
    };

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

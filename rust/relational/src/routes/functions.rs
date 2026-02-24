use axum::extract::{DefaultBodyLimit, State};
use axum::http::{HeaderMap, HeaderValue};
use axum::routing::post;
use axum::{Json, Router};
use sqlx::Row;

use crate::api_models::functions::{
    FunctionCallRequest, FunctionCallResponse, FunctionDeployRequest, FunctionDeployResponse,
};
use crate::functions::executor::{ensure_runtime_tables, execute_manifest_function};
use crate::functions::manifest::{
    load_functions_from_uploaded_sources, FunctionsManifest,
};
use skypydb_application::state::AppState;
use skypydb_common::api::envelope::ApiEnvelope;
use skypydb_errors::AppError;

const ACTIVE_DEPLOYMENT_ID: i32 = 1;
const API_KEY_HEADER: &str = "X-API-Key";
const MAX_DEPLOY_FILES: usize = 256;
const MAX_DEPLOY_FILE_BYTES: usize = 512 * 1024;
const MAX_DEPLOY_TOTAL_BYTES: usize = 8 * 1024 * 1024;
const MAX_DEPLOY_BODY_BYTES: usize = MAX_DEPLOY_TOTAL_BYTES + (1024 * 1024);

/// Registers function execution endpoints.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/functions/call", post(call_function))
        .route(
            "/functions/deploy",
            post(deploy_functions).layer(DefaultBodyLimit::max(MAX_DEPLOY_BODY_BYTES)),
        )
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

    let manifest = load_runtime_manifest(&state).await?;
    if !manifest.functions.contains_key(&endpoint) {
        return Err(AppError::not_found(format!(
            "function endpoint '{}' not found in the active deployed manifest",
            endpoint
        )));
    }
    ensure_runtime_tables(&state.pool, state.config.query_max_limit, &manifest).await?;

    let args = request.args_object()?;
    let result = execute_manifest_function(
        &state.pool,
        state.config.query_max_limit,
        &state.config.public_api_url,
        state.config.storage_upload_url_ttl_seconds,
        &manifest,
        &endpoint,
        args,
    )
    .await?;
    Ok(Json(ApiEnvelope::ok(FunctionCallResponse { result })))
}

async fn deploy_functions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<FunctionDeployRequest>,
) -> Result<Json<ApiEnvelope<FunctionDeployResponse>>, AppError> {
    ensure_api_key_header(&state, &headers)?;
    validate_deploy_payload_limits(&request)?;

    let mode = normalize_deploy_mode(request.mode.as_deref())?;
    let uploaded_files = request
        .files
        .iter()
        .map(|file| (file.path.clone(), file.content.clone()))
        .collect::<Vec<(String, String)>>();

    let manifest = load_functions_from_uploaded_sources(&uploaded_files)?;
    if manifest.functions.is_empty() {
        return Err(AppError::validation(
            "deploy payload did not contain any readFunction/writeFunction exports",
        ));
    }
    ensure_runtime_tables(&state.pool, state.config.query_max_limit, &manifest).await?;

    let manifest_json = serde_json::to_string(&manifest)
        .map_err(|error| AppError::internal(format!("failed to serialize manifest: {}", error)))?;
    sqlx::query(
        r#"
        INSERT INTO _functions_deployments (id, manifest_json, deployment_mode, deployed_at)
        VALUES (?, ?, ?, UTC_TIMESTAMP(6)) AS new
        ON DUPLICATE KEY UPDATE
            manifest_json = new.manifest_json,
            deployment_mode = new.deployment_mode,
            deployed_at = new.deployed_at
        "#,
    )
    .bind(ACTIVE_DEPLOYMENT_ID)
    .bind(manifest_json)
    .bind(&mode)
    .execute(&state.pool)
    .await?;

    Ok(Json(ApiEnvelope::ok(FunctionDeployResponse {
        deployed_functions: manifest.functions.len(),
        mode,
    })))
}

fn normalize_deploy_mode(mode: Option<&str>) -> Result<String, AppError> {
    let normalized = mode.unwrap_or("local").trim().to_ascii_lowercase();
    match normalized.as_str() {
        "local" | "cloud" => Ok(normalized),
        _ => Err(AppError::validation(format!(
            "deploy mode '{}' is invalid; expected 'local' or 'cloud'",
            normalized
        ))),
    }
}

fn ensure_api_key_header(state: &AppState, headers: &HeaderMap) -> Result<(), AppError> {
    let provided_key = headers
        .get(API_KEY_HEADER)
        .ok_or_else(|| AppError::unauthorized(format!("missing {} header", API_KEY_HEADER)))?;
    let expected_key = HeaderValue::from_str(&state.config.api_key)
        .map_err(|_| AppError::config("configured API key is not a valid header value"))?;
    if provided_key != expected_key {
        return Err(AppError::unauthorized("invalid API key"));
    }
    Ok(())
}

fn validate_deploy_payload_limits(request: &FunctionDeployRequest) -> Result<(), AppError> {
    if request.files.is_empty() {
        return Err(AppError::validation(
            "deploy payload must include at least one source file",
        ));
    }
    if request.files.len() > MAX_DEPLOY_FILES {
        return Err(AppError::validation(format!(
            "deploy payload exceeds max file count of {}",
            MAX_DEPLOY_FILES
        )));
    }

    let mut total_size = 0usize;
    for file in &request.files {
        let file_size = file.content.len();
        if file_size > MAX_DEPLOY_FILE_BYTES {
            return Err(AppError::validation(format!(
                "source file '{}' exceeds max size of {} bytes",
                file.path, MAX_DEPLOY_FILE_BYTES
            )));
        }
        total_size = total_size.checked_add(file_size).ok_or_else(|| {
            AppError::validation("deploy payload size overflowed while validating files")
        })?;
    }
    if total_size > MAX_DEPLOY_TOTAL_BYTES {
        return Err(AppError::validation(format!(
            "deploy payload exceeds max combined source size of {} bytes",
            MAX_DEPLOY_TOTAL_BYTES
        )));
    }

    Ok(())
}

async fn load_runtime_manifest(state: &AppState) -> Result<FunctionsManifest, AppError> {
    load_deployed_manifest(state).await?.ok_or_else(|| {
        AppError::not_found(
            "no deployed functions available; run `npx skypydb deploy --local` or `npx skypydb deploy --cloud` first",
        )
    })
}

async fn load_deployed_manifest(state: &AppState) -> Result<Option<FunctionsManifest>, AppError> {
    let row = sqlx::query(
        r#"
        SELECT manifest_json
        FROM _functions_deployments
        WHERE id = ?
        "#,
    )
    .bind(ACTIVE_DEPLOYMENT_ID)
    .fetch_optional(&state.pool)
    .await?;

    let Some(row) = row else {
        return Ok(None);
    };

    let manifest_json: String = row.try_get("manifest_json")?;
    let manifest = serde_json::from_str::<FunctionsManifest>(&manifest_json).map_err(|error| {
        AppError::internal(format!(
            "active deployed manifest is invalid JSON and must be redeployed: {}",
            error
        ))
    })?;
    Ok(Some(manifest))
}

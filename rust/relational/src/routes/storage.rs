use std::path::PathBuf;

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{NaiveDateTime, Utc};
use skypydb_application::state::AppState;
use skypydb_common::api::envelope::ApiEnvelope;
use skypydb_errors::AppError;
use sqlx::Row;
use tokio::fs;

use crate::api_models::storage::StorageUploadResponse;

/// Registers public storage upload and retrieval endpoints.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/storage/upload/:token", post(upload_storage_file))
        .route("/storage/files/:storage_id", get(get_storage_file))
}

async fn upload_storage_file(
    State(state): State<AppState>,
    Path(token): Path<String>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<ApiEnvelope<StorageUploadResponse>>, AppError> {
    if body.is_empty() {
        return Err(AppError::validation("upload body cannot be empty"));
    }
    if body.len() > state.config.storage_max_upload_bytes {
        return Err(AppError::validation(format!(
            "upload exceeds max allowed size of {} bytes",
            state.config.storage_max_upload_bytes
        )));
    }

    let mut transaction = state.pool.begin().await?;
    let token_row = sqlx::query(
        r#"
        SELECT storage_id, expires_at
        FROM _storage_upload_tokens
        WHERE token = ?
        FOR UPDATE
        "#,
    )
    .bind(&token)
    .fetch_optional(&mut *transaction)
    .await?;

    let Some(token_row) = token_row else {
        return Err(AppError::not_found("upload URL is invalid or already used"));
    };

    let storage_id: String = token_row.try_get("storage_id")?;
    let expires_at: NaiveDateTime = token_row.try_get("expires_at")?;
    let now = Utc::now().naive_utc();
    if now > expires_at {
        sqlx::query("DELETE FROM _storage_upload_tokens WHERE token = ?")
            .bind(&token)
            .execute(&mut *transaction)
            .await?;
        transaction.commit().await?;
        return Err(AppError::validation("upload URL has expired"));
    }

    let content_type = extract_content_type(&headers);
    let storage_dir = PathBuf::from(state.config.storage_dir.as_str());
    fs::create_dir_all(&storage_dir).await.map_err(|error| {
        AppError::internal(format!(
            "failed to create storage directory '{}': {}",
            storage_dir.display(),
            error
        ))
    })?;

    let file_path = storage_dir.join(format!("{}.bin", storage_id));
    fs::write(&file_path, &body).await.map_err(|error| {
        AppError::internal(format!(
            "failed to write storage file '{}': {}",
            file_path.display(),
            error
        ))
    })?;

    sqlx::query(
        r#"
        INSERT INTO _storage_files (id, content_type, byte_size, file_path)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            content_type = VALUES(content_type),
            byte_size = VALUES(byte_size),
            file_path = VALUES(file_path)
        "#,
    )
    .bind(&storage_id)
    .bind(&content_type)
    .bind(body.len() as u64)
    .bind(file_path.to_string_lossy().to_string())
    .execute(&mut *transaction)
    .await?;

    sqlx::query("DELETE FROM _storage_upload_tokens WHERE token = ?")
        .bind(&token)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    Ok(Json(ApiEnvelope::ok(StorageUploadResponse { storage_id })))
}

async fn get_storage_file(
    State(state): State<AppState>,
    Path(storage_id): Path<String>,
) -> Result<Response, AppError> {
    let row = sqlx::query(
        r#"
        SELECT content_type, file_path
        FROM _storage_files
        WHERE id = ?
        "#,
    )
    .bind(&storage_id)
    .fetch_optional(&state.pool)
    .await?;

    let Some(row) = row else {
        return Err(AppError::not_found(format!(
            "storage object '{}' not found",
            storage_id
        )));
    };

    let content_type: String = row.try_get("content_type")?;
    let file_path: String = row.try_get("file_path")?;
    let bytes = fs::read(&file_path).await.map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found(format!(
                "storage object '{}' file is missing",
                storage_id
            ))
        } else {
            AppError::internal(format!(
                "failed to read storage file '{}': {}",
                file_path, error
            ))
        }
    })?;

    let mut response = (StatusCode::OK, bytes).into_response();
    let response_headers = response.headers_mut();
    response_headers.insert(
        CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=31536000, immutable"),
    );
    response_headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_str(&content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
    );
    Ok(response)
}

fn extract_content_type(headers: &HeaderMap) -> String {
    headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "application/octet-stream".to_string())
}


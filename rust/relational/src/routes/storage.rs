use std::path::{Path as FsPath, PathBuf};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{NaiveDateTime, Utc};
use serde::Deserialize;
use mesosphere_application::state::AppState;
use mesosphere_common::api::envelope::ApiEnvelope;
use mesosphere_errors::AppError;
use sqlx::Row;
use tokio::fs;
use uuid::Uuid;

use crate::api_models::storage::StorageUploadResponse;

const UPLOAD_TOKEN_HEADER: &str = "X-Upload-Token";

/// Registers public storage endpoints.
/// Upload accepts one-time token authentication via `?token=<uuid>` or `X-Upload-Token`.
pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/storage/files/:storage_id", get(get_storage_file))
        .route("/storage/upload", post(upload_storage_file))
}

/// Registers protected storage endpoints.
/// Kept for compatibility and future authenticated storage routes.
pub fn protected_router() -> Router<AppState> {
    Router::new()
}

#[derive(Debug, Deserialize)]
struct UploadTokenQuery {
    token: Option<String>,
}

async fn upload_storage_file(
    State(state): State<AppState>,
    Query(query): Query<UploadTokenQuery>,
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
    let token = required_upload_token(&headers, query.token.as_deref())?;

    let mut transaction = Some(state.pool.begin().await?);
    let token_row = {
        let tx = transaction
            .as_mut()
            .ok_or_else(|| AppError::internal("transaction missing during token lookup"))?;
        sqlx::query(
            r#"
            SELECT storage_id, expires_at
            FROM _storage_upload_tokens
            WHERE token = ?
            FOR UPDATE
            "#,
        )
        .bind(&token)
        .fetch_optional(&mut **tx)
        .await?
    };

    let Some(token_row) = token_row else {
        return Err(AppError::not_found("upload URL is invalid or already used"));
    };

    let storage_id: String = token_row.try_get("storage_id")?;
    let expires_at: NaiveDateTime = token_row.try_get("expires_at")?;
    let now = Utc::now().naive_utc();
    if now > expires_at {
        {
            let tx = transaction
                .as_mut()
                .ok_or_else(|| AppError::internal("transaction missing during token cleanup"))?;
            sqlx::query("DELETE FROM _storage_upload_tokens WHERE token = ?")
                .bind(&token)
                .execute(&mut **tx)
                .await?;
        }
        let tx = transaction
            .take()
            .ok_or_else(|| AppError::internal("transaction missing during commit"))?;
        tx.commit().await?;
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

    // Guard against path traversal if storage_id originates from user-controlled input.
    if storage_id.contains('/') || storage_id.contains('\\') || storage_id.contains("..") {
        return Err(AppError::internal(format!(
            "storage_id '{}' contains invalid path characters",
            storage_id
        )));
    }
    let final_file_path = storage_dir.join(format!("{}.bin", storage_id));
    let stored_filename = final_file_path
        .file_name()
        .and_then(|file_name| file_name.to_str())
        .map(ToOwned::to_owned)
        .ok_or_else(|| {
            AppError::internal(format!(
                "storage filename for '{}' is not valid UTF-8",
                final_file_path.display()
            ))
        })?;
    let temp_file_path = storage_dir.join(format!("{}.{}.bin.tmp", storage_id, Uuid::new_v4()));
    fs::write(&temp_file_path, &body).await.map_err(|error| {
        AppError::internal(format!(
            "failed to write temporary storage file '{}': {}",
            temp_file_path.display(),
            error
        ))
    })?;

    let db_result: Result<(), AppError> = async {
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
        .bind(&stored_filename)
        .execute({
            let tx = transaction
                .as_mut()
                .ok_or_else(|| AppError::internal("transaction missing during file upsert"))?;
            &mut **tx
        })
        .await?;

        sqlx::query("DELETE FROM _storage_upload_tokens WHERE token = ?")
            .bind(&token)
            .execute({
                let tx = transaction.as_mut().ok_or_else(|| {
                    AppError::internal("transaction missing during token deletion")
                })?;
                &mut **tx
            })
            .await?;

        fs::rename(&temp_file_path, &final_file_path)
            .await
            .map_err(|error| {
                AppError::internal(format!(
                    "failed to finalize storage file '{}' from '{}': {}",
                    final_file_path.display(),
                    temp_file_path.display(),
                    error
                ))
            })?;

        let tx = transaction
            .take()
            .ok_or_else(|| AppError::internal("transaction missing during commit"))?;
        tx.commit().await?;
        Ok(())
    }
    .await;

    if let Err(error) = db_result {
        let mut cleanup_failures = Vec::<String>::new();
        if let Some(tx) = transaction.take() {
            if let Err(rollback_error) = tx.rollback().await {
                cleanup_failures.push(format!("transaction rollback failed: {}", rollback_error));
            }
        }
        if let Err(cleanup_error) = remove_file_if_exists(&temp_file_path).await {
            cleanup_failures.push(format!(
                "failed to remove temporary file '{}': {}",
                temp_file_path.display(),
                cleanup_error
            ));
        }
        if let Err(cleanup_error) = remove_file_if_exists(&final_file_path).await {
            cleanup_failures.push(format!(
                "failed to remove finalized file '{}': {}",
                final_file_path.display(),
                cleanup_error
            ));
        }
        if cleanup_failures.is_empty() {
            return Err(error);
        }
        return Err(AppError::internal(format!(
            "{}; cleanup failed: {}",
            error,
            cleanup_failures.join("; ")
        )));
    }

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
    let stored_filename: String = row.try_get("file_path")?;
    if stored_filename.contains('/') || stored_filename.contains('\\') || stored_filename.contains("..")
    {
        return Err(AppError::internal(format!(
            "storage file name '{}' contains invalid path characters",
            stored_filename
        )));
    }
    let file_path = PathBuf::from(state.config.storage_dir.as_str()).join(&stored_filename);
    let bytes = fs::read(&file_path).await.map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found(format!("storage object '{}' file is missing", storage_id))
        } else {
            AppError::internal(format!(
                "failed to read storage file '{}': {}",
                file_path.display(),
                error
            ))
        }
    })?;

    let mut response = (StatusCode::OK, bytes).into_response();
    let response_headers = response.headers_mut();
    response_headers.insert(
        CACHE_CONTROL,
        HeaderValue::from_static("private, max-age=31536000"),
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

fn required_upload_token(headers: &HeaderMap, query_token: Option<&str>) -> Result<String, AppError> {
    if let Some(raw_token) = query_token {
        return normalize_upload_token(raw_token, "token query parameter");
    }

    let header_value = headers
        .get(UPLOAD_TOKEN_HEADER)
        .ok_or_else(|| AppError::validation(format!("{} header is required", UPLOAD_TOKEN_HEADER)))?;
    let raw_token = header_value.to_str().map_err(|_| {
        AppError::validation(format!(
            "{} header must be valid UTF-8",
            UPLOAD_TOKEN_HEADER
        ))
    })?;
    normalize_upload_token(raw_token, &format!("{} header", UPLOAD_TOKEN_HEADER))
}

fn normalize_upload_token(raw_token: &str, source: &str) -> Result<String, AppError> {
    let token = raw_token.trim();
    if token.is_empty() {
        return Err(AppError::validation(format!("{} cannot be empty", source)));
    }
    let parsed = Uuid::parse_str(token)
        .map_err(|_| AppError::validation(format!("{} must contain a valid UUID token", source)))?;
    Ok(parsed.hyphenated().to_string())
}

async fn remove_file_if_exists(path: &FsPath) -> Result<(), std::io::Error> {
    match fs::remove_file(path).await {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

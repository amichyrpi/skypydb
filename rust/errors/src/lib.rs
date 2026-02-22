use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use thiserror::Error;

/// JSON error payload returned by REST endpoints.
#[derive(Debug, Serialize)]
pub struct ErrorBody {
    /// Error class identifier.
    pub error: String,
    /// Stable machine-readable error code.
    pub code: String,
    /// Short user-facing error description.
    pub description: String,
    /// Human-readable message.
    pub message: String,
}

/// Unified backend error type mapped to HTTP responses.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("configuration error: {0}")]
    Config(String),
    #[error("validation error: {0}")]
    Validation(String),
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("internal error: {0}")]
    Internal(String),
}

impl AppError {
    /// Creates a configuration error.
    pub fn config(message: impl Into<String>) -> Self {
        Self::Config(message.into())
    }

    /// Creates a validation error.
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }

    /// Creates an unauthorized error.
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::Unauthorized(message.into())
    }

    /// Creates a not-found error.
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }

    /// Creates an internal error.
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }

    fn status_code(&self) -> StatusCode {
        match self {
            Self::Config(_) | Self::Internal(_) | Self::Database(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
        }
    }

    fn error_name(&self) -> &'static str {
        match self {
            Self::Config(_) => "ConfigError",
            Self::Validation(_) => "ValidationError",
            Self::Unauthorized(_) => "UnauthorizedError",
            Self::NotFound(_) => "NotFoundError",
            Self::Database(_) => "DatabaseError",
            Self::Internal(_) => "InternalError",
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::Config(_) => "CONFIG_ERROR",
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::Unauthorized(_) => "UNAUTHORIZED",
            Self::NotFound(_) => "NOT_FOUND",
            Self::Database(_) => "DATABASE_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    fn error_description(&self) -> &'static str {
        match self {
            Self::Config(_) => "Server configuration is invalid or incomplete.",
            Self::Validation(_) => "Request payload failed validation checks.",
            Self::Unauthorized(_) => "Authentication failed or API key is missing.",
            Self::NotFound(_) => "Requested resource or function endpoint was not found.",
            Self::Database(_) => "Database operation failed while processing the request.",
            Self::Internal(_) => "Unexpected internal server error.",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = ErrorBody {
            error: self.error_name().to_string(),
            code: self.error_code().to_string(),
            description: self.error_description().to_string(),
            message: self.to_string(),
        };
        (self.status_code(), Json(body)).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(value: sqlx::Error) -> Self {
        Self::Database(value.to_string())
    }
}

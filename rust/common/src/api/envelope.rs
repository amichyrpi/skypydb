use serde::{Deserialize, Serialize};

/// Standard success envelope returned by API handlers.
#[derive(Debug, Serialize)]
pub struct ApiEnvelope<T>
where
    T: Serialize,
{
    /// Indicates successful request completion.
    pub ok: bool,
    /// Endpoint-specific response payload.
    pub data: T,
}

impl<T> ApiEnvelope<T>
where
    T: Serialize,
{
    /// Wraps payload data in the standard success envelope.
    pub fn ok(data: T) -> Self {
        Self { ok: true, data }
    }
}

/// Generic message payload for non-entity responses.
#[derive(Debug, Serialize)]
pub struct ApiMessage {
    /// Human-readable message text.
    pub message: String,
}

/// Generic affected-row count response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AffectedRowsResponse {
    /// Number of rows affected by write operation.
    pub affected_rows: u64,
}

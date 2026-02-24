use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use mesosphere_application::state::AppState;

/// Simple liveness/readiness response payload.
#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

/// Registers liveness and readiness endpoints.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/healthz", get(health))
        .route("/readyz", get(ready))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn ready() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ready" })
}

use axum::extract::State;
use axum::http::{HeaderValue, Request};
use axum::middleware::Next;
use axum::response::Response;
use skypydb_application::state::AppState;
use skypydb_errors::AppError;

/// Ensures every protected request includes the configured `X-API-Key`.
pub async fn require_api_key(
    State(state): State<AppState>,
    request: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, AppError> {
    let provided_key = request
        .headers()
        .get("X-API-Key")
        .ok_or_else(|| AppError::unauthorized("missing X-API-Key header"))?;
    let expected_key = HeaderValue::from_str(&state.config.api_key)
        .map_err(|_| AppError::config("configured API key is not a valid header value"))?;

    if provided_key != expected_key {
        return Err(AppError::unauthorized("invalid API key"));
    }

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::middleware::from_fn_with_state;
    use axum::routing::get;
    use axum::Router;
    use skypydb_application::config::AppConfig;
    use skypydb_application::state::AppState;
    use sqlx::mysql::MySqlPoolOptions;
    use tower::ServiceExt;

    use crate::require_api_key;

    fn test_state() -> AppState {
        let config = AppConfig {
            server_port: 8000,
            api_key: "test-key".to_string(),
            mysql_url: "mysql://user:pass@localhost:3306/skypydb".to_string(),
            mysql_pool_min: 1,
            mysql_pool_max: 1,
            log_level: "debug".to_string(),
            cors_origins: vec!["*".to_string()],
            vector_max_dim: 4096,
            query_max_limit: 100,
            functions_source_dir: "./skypydb".to_string(),
        };
        let pool = MySqlPoolOptions::new()
            .connect_lazy(&config.mysql_url)
            .expect("lazy pool");
        AppState::new(config, pool)
    }

    #[tokio::test]
    async fn middleware_rejects_missing_api_key() {
        let state = test_state();
        let app = Router::new()
            .route("/", get(|| async { "ok" }))
            .layer(from_fn_with_state(state.clone(), require_api_key))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn middleware_accepts_valid_api_key() {
        let state = test_state();
        let app = Router::new()
            .route("/", get(|| async { "ok" }))
            .layer(from_fn_with_state(state.clone(), require_api_key))
            .with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/")
                    .header("X-API-Key", "test-key")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
    }
}

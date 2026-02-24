use std::net::SocketAddr;

use axum::middleware::{from_fn, from_fn_with_state};
use axum::routing::get;
use axum::serve;
use axum::Router;
use http::HeaderValue;
use mesosphere_application::config::AppConfig;
use mesosphere_application::state::AppState;
use mesosphere_authentication::require_api_key;
use mesosphere_common::middleware::request_id::attach_request_id;
use mesosphere_common::openapi::openapi_json;
use mesosphere_db_connection::build_mysql_pool;
use mesosphere_file_storage::maybe_backup_on_startup;
use mesosphere_health_check::router as health_router;
use mesosphere_metrics::{init_metrics, MetricsConfig};
use mesosphere_mysql::run_bootstrap_migrations;
use mesosphere_relational::routes::functions::router as functions_router;
use mesosphere_relational::routes::storage::{
    protected_router as protected_storage_router, public_router as public_storage_router,
};
use mesosphere_telemetry::{init_tracing, trace_http_action};
use mesosphere_vector::routes::router as vector_router;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

/// Starts the Mesosphere HTTP backend and serves all REST endpoints.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    let config = AppConfig::from_env()?;
    init_metrics(MetricsConfig::from_env())?;
    init_tracing(&config.log_level)?;
    info!("function runtime enabled (deployed manifest)");

    let pool = build_mysql_pool(&config).await?;
    run_bootstrap_migrations(&pool).await?;
    let _ = maybe_backup_on_startup(&pool).await?;

    let state = AppState::new(config.clone(), pool);
    let app = build_router(state);

    let address = SocketAddr::from(([0, 0, 0, 0], config.server_port));
    let listener = TcpListener::bind(address).await?;
    info!("mesosphere backend listening on {}", address);

    serve(listener, app).await?;
    Ok(())
}

fn build_router(state: AppState) -> Router {
    let public_v1_router = Router::new().merge(public_storage_router());
    let protected_router = Router::new()
        .merge(protected_storage_router())
        .merge(functions_router())
        .merge(vector_router())
        .layer(from_fn_with_state(state.clone(), require_api_key));

    Router::<AppState>::new()
        .merge(health_router())
        .route("/openapi.json", get(openapi_json))
        .nest("/v1", public_v1_router.merge(protected_router))
        .layer(from_fn(trace_http_action))
        .layer(from_fn(attach_request_id))
        .layer(cors_layer(&state))
        .with_state(state.clone())
}

fn cors_layer(state: &AppState) -> CorsLayer {
    if state.config.cors_origins.iter().any(|origin| origin == "*") {
        return CorsLayer::new()
            .allow_origin(Any)
            .allow_headers(Any)
            .allow_methods(Any);
    }

    let allowed_origins = state
        .config
        .cors_origins
        .iter()
        .filter_map(|origin| HeaderValue::from_str(origin).ok())
        .collect::<Vec<HeaderValue>>();

    if allowed_origins.is_empty() {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_headers(Any)
            .allow_methods(Any)
    } else {
        CorsLayer::new()
            .allow_origin(allowed_origins)
            .allow_headers(Any)
            .allow_methods(Any)
    }
}

#[cfg(test)]
mod tests {
    use super::build_router;
    use mesosphere_application::config::AppConfig;
    use mesosphere_application::state::AppState;
    use sqlx::mysql::MySqlPoolOptions;

    fn test_state() -> AppState {
        let config = AppConfig {
            server_port: 8000,
            api_key: "test-api-key".to_string(),
            mysql_url: "mysql://user:pass@localhost/mesosphere".to_string(),
            mysql_pool_min: 1,
            mysql_pool_max: 2,
            log_level: "info".to_string(),
            cors_origins: vec!["*".to_string()],
            vector_max_dim: 4096,
            query_max_limit: 500,
            storage_dir: "./mesosphere-storage".to_string(),
            public_api_url: "http://localhost:8000".to_string(),
            storage_upload_url_ttl_seconds: 900,
            storage_max_upload_bytes: 25 * 1024 * 1024,
        };
        let pool = MySqlPoolOptions::new()
            .connect_lazy("mysql://user:pass@localhost/mesosphere")
            .expect("test mysql URL should be valid");
        AppState::new(config, pool)
    }

    #[tokio::test]
    async fn build_router_constructs_without_panicking() {
        let state = test_state();
        let _app = build_router(state);
    }
}

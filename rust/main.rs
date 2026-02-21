use std::net::SocketAddr;

use axum::middleware::{from_fn, from_fn_with_state};
use axum::routing::get;
use axum::serve;
use axum::Router;
use http::HeaderValue;
use skypydb_application::config::AppConfig;
use skypydb_application::state::AppState;
use skypydb_authentication::require_api_key;
use skypydb_common::middleware::request_id::attach_request_id;
use skypydb_common::openapi::openapi_json;
use skypydb_db_connection::build_mysql_pool;
use skypydb_file_storage::maybe_backup_on_startup;
use skypydb_health_check::router as health_router;
use skypydb_metrics::{init_metrics, MetricsConfig};
use skypydb_mysql::run_bootstrap_migrations;
use skypydb_relational::routes::admin_schema::router as admin_schema_router;
use skypydb_relational::routes::relational::router as relational_router;
use skypydb_telemetry::{init_tracing, trace_http_action};
use skypydb_vector::routes::router as vector_router;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

/// Starts the Skypydb HTTP backend and serves all REST endpoints.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    let config = AppConfig::from_env()?;
    init_metrics(MetricsConfig::from_env())?;
    init_tracing(&config.log_level)?;

    let pool = build_mysql_pool(&config).await?;
    run_bootstrap_migrations(&pool).await?;
    let _ = maybe_backup_on_startup(&pool).await?;

    let state = AppState::new(config.clone(), pool);
    let app = build_router(state);

    let address = SocketAddr::from(([0, 0, 0, 0], config.server_port));
    let listener = TcpListener::bind(address).await?;
    info!("skypydb backend listening on {}", address);

    serve(listener, app).await?;
    Ok(())
}

fn build_router(state: AppState) -> Router {
    let protected_router = Router::new()
        .merge(admin_schema_router())
        .merge(relational_router())
        .merge(vector_router())
        .layer(from_fn_with_state(state.clone(), require_api_key));

    Router::<AppState>::new()
        .merge(health_router())
        .route("/openapi.json", get(openapi_json))
        .nest("/v1", protected_router)
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

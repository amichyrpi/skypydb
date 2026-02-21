use std::sync::Arc;

use sqlx::MySqlPool;

use crate::config::AppConfig;

/// Shared state injected into all request handlers.
#[derive(Clone)]
pub struct AppState {
    /// Immutable runtime configuration.
    pub config: Arc<AppConfig>,
    /// Shared async MySQL pool.
    pub pool: MySqlPool,
}

impl AppState {
    /// Creates a new application state object from config and pool.
    pub fn new(config: AppConfig, pool: MySqlPool) -> Self {
        Self {
            config: Arc::new(config),
            pool,
        }
    }
}

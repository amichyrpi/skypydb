use mesosphere_application::config::AppConfig;
use mesosphere_errors::AppError;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

/// Creates the shared asynchronous MySQL connection pool.
pub async fn build_mysql_pool(config: &AppConfig) -> Result<MySqlPool, AppError> {
    let pool = MySqlPoolOptions::new()
        .min_connections(config.mysql_pool_min)
        .max_connections(config.mysql_pool_max)
        .connect(&config.mysql_url)
        .await?;

    Ok(pool)
}

use std::env;

use skypydb_errors::AppError;

/// Runtime configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// HTTP bind port (default `8000`).
    pub server_port: u16,
    /// Static API key used by request auth middleware.
    pub api_key: String,
    /// MySQL DSN used by sqlx.
    pub mysql_url: String,
    /// Minimum connection count for the MySQL pool.
    pub mysql_pool_min: u32,
    /// Maximum connection count for the MySQL pool.
    pub mysql_pool_max: u32,
    /// Tracing log level filter.
    pub log_level: String,
    /// Comma-separated list of allowed CORS origins.
    pub cors_origins: Vec<String>,
    /// Maximum vector embedding dimension accepted by API.
    pub vector_max_dim: usize,
    /// Maximum query limit accepted by relational endpoints.
    pub query_max_limit: u32,
    /// Filesystem path to TypeScript functions source directory.
    pub functions_source_dir: String,
    /// Filesystem directory where uploaded storage objects are persisted.
    pub storage_dir: String,
    /// Public base URL used to generate file upload and access URLs.
    pub public_api_url: String,
    /// Expiration window (seconds) for one-time upload URLs.
    pub storage_upload_url_ttl_seconds: u32,
    /// Maximum allowed upload size in bytes for storage uploads.
    pub storage_max_upload_bytes: usize,
}

impl AppConfig {
    /// Parses and validates all runtime configuration from env vars.
    pub fn from_env() -> Result<Self, AppError> {
        let server_port = parse_u16_with_default("SKYPYDB_SERVER_PORT", 8000)?;
        let api_key = env::var("SKYPYDB_API_KEY")
            .map_err(|_| AppError::config("SKYPYDB_API_KEY is required"))?;
        let mysql_url = env::var("SKYPYDB_MYSQL_URL")
            .map_err(|_| AppError::config("SKYPYDB_MYSQL_URL is required"))?;
        let mysql_pool_min = parse_u32_with_default("SKYPYDB_MYSQL_POOL_MIN", 1)?;
        let mysql_pool_max = parse_u32_with_default("SKYPYDB_MYSQL_POOL_MAX", 10)?;
        let log_level = env::var("SKYPYDB_LOG_LEVEL").unwrap_or_else(|_| "info".to_string());
        let vector_max_dim = parse_usize_with_default("SKYPYDB_VECTOR_MAX_DIM", 4096)?;
        let query_max_limit = parse_u32_with_default("SKYPYDB_QUERY_MAX_LIMIT", 500)?;
        let functions_source_dir =
            env::var("SKYPYDB_FUNCTIONS_SOURCE_DIR").unwrap_or_else(|_| "./skypydb".to_string());
        let storage_dir =
            env::var("SKYPYDB_STORAGE_DIR").unwrap_or_else(|_| "./skypydb-storage".to_string());
        let public_api_url = env::var("SKYPYDB_PUBLIC_API_URL")
            .unwrap_or_else(|_| format!("http://localhost:{}", server_port));
        let storage_upload_url_ttl_seconds =
            parse_u32_with_default("SKYPYDB_STORAGE_UPLOAD_URL_TTL_SECONDS", 900)?;
        let storage_max_upload_bytes =
            parse_usize_with_default("SKYPYDB_STORAGE_MAX_UPLOAD_BYTES", 25 * 1024 * 1024)?;
        let cors_origins = env::var("SKYPYDB_CORS_ORIGINS")
            .unwrap_or_else(|_| "*".to_string())
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(ToOwned::to_owned)
            .collect::<Vec<String>>();

        if mysql_pool_min > mysql_pool_max {
            return Err(AppError::config(
                "SKYPYDB_MYSQL_POOL_MIN cannot be greater than SKYPYDB_MYSQL_POOL_MAX",
            ));
        }

        Ok(Self {
            server_port,
            api_key,
            mysql_url,
            mysql_pool_min,
            mysql_pool_max,
            log_level,
            cors_origins,
            vector_max_dim,
            query_max_limit,
            functions_source_dir,
            storage_dir,
            public_api_url,
            storage_upload_url_ttl_seconds,
            storage_max_upload_bytes,
        })
    }
}

fn parse_u16_with_default(name: &str, default_value: u16) -> Result<u16, AppError> {
    match env::var(name) {
        Ok(value) => value
            .parse::<u16>()
            .map_err(|_| AppError::config(format!("{} must be a valid u16", name))),
        Err(_) => Ok(default_value),
    }
}

fn parse_u32_with_default(name: &str, default_value: u32) -> Result<u32, AppError> {
    match env::var(name) {
        Ok(value) => value
            .parse::<u32>()
            .map_err(|_| AppError::config(format!("{} must be a valid u32", name))),
        Err(_) => Ok(default_value),
    }
}

fn parse_usize_with_default(name: &str, default_value: usize) -> Result<usize, AppError> {
    match env::var(name) {
        Ok(value) => value
            .parse::<usize>()
            .map_err(|_| AppError::config(format!("{} must be a valid usize", name))),
        Err(_) => Ok(default_value),
    }
}

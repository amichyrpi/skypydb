use std::env;
use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::Utc;
use serde::Deserialize;
use serde_json::{Map, Value};
use mesosphere_errors::AppError;
use mesosphere_google_cloud_utils::default_cloud_run_settings;
use sqlx::mysql::MySqlRow;
use sqlx::{Column, MySqlPool, Row};
use tracing::info;

/// Backup destination selected for MySQL snapshots.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackupTarget {
    /// Write snapshots to the local filesystem.
    LocalFile,
    /// Upload snapshots to Google Cloud Storage.
    GoogleCloudStorage,
}

/// File-backup configuration for MySQL snapshot storage.
#[derive(Debug, Clone)]
pub struct BackupConfig {
    /// Enables startup backups.
    pub enabled_on_startup: bool,
    /// Destination directory for local JSON snapshot files.
    pub local_output_dir: PathBuf,
    /// Google Cloud Storage bucket receiving snapshots.
    pub gcs_bucket: Option<String>,
    /// Optional object prefix inside the bucket.
    pub gcs_prefix: String,
    /// Backup destination.
    pub target: BackupTarget,
}

/// Metadata describing one emitted snapshot artifact.
#[derive(Debug, Clone)]
pub struct BackupArtifact {
    /// URI of the written snapshot (`file://...` or `gs://...`).
    pub uri: String,
    /// MySQL database name that was snapshotted.
    pub database: String,
    /// Number of exported tables.
    pub table_count: usize,
    /// Number of exported rows.
    pub row_count: u64,
}

impl BackupConfig {
    /// Reads backup configuration from environment variables.
    pub fn from_env() -> Self {
        let enabled_on_startup = env::var("MESOSPHERE_MYSQL_BACKUP_ON_STARTUP")
            .ok()
            .map(|value| matches!(value.to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
            .unwrap_or(false);

        let local_output_dir = env::var("MESOSPHERE_MYSQL_BACKUP_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("./mesosphere-backups"));

        let gcs_bucket = env::var("MESOSPHERE_GCS_BACKUP_BUCKET")
            .ok()
            .map(|bucket| bucket.trim().to_string())
            .filter(|bucket| !bucket.is_empty());

        let gcs_prefix = env::var("MESOSPHERE_GCS_BACKUP_PREFIX")
            .unwrap_or_default()
            .trim_matches('/')
            .to_string();

        let cloud_run = default_cloud_run_settings().is_cloud_run();
        let target_mode = env::var("MESOSPHERE_BACKUP_TARGET")
            .unwrap_or_else(|_| "auto".to_string())
            .to_ascii_lowercase();

        let target = match target_mode.as_str() {
            "local" => BackupTarget::LocalFile,
            "gcs" => BackupTarget::GoogleCloudStorage,
            _ => {
                if cloud_run {
                    BackupTarget::GoogleCloudStorage
                } else {
                    BackupTarget::LocalFile
                }
            }
        };

        Self {
            enabled_on_startup,
            local_output_dir,
            gcs_bucket,
            gcs_prefix,
            target,
        }
    }

    fn validate(&self) -> Result<(), AppError> {
        if self.target == BackupTarget::GoogleCloudStorage {
            let has_bucket = self
                .gcs_bucket
                .as_ref()
                .map(|bucket| !bucket.trim().is_empty())
                .unwrap_or(false);
            if !has_bucket {
                return Err(AppError::config(
                    "MESOSPHERE_GCS_BACKUP_BUCKET is required when backup target is gcs",
                ));
            }
        }

        Ok(())
    }
}

/// Runs a full logical MySQL snapshot backup if startup backups are enabled.
pub async fn maybe_backup_on_startup(pool: &MySqlPool) -> Result<Option<BackupArtifact>, AppError> {
    let config = BackupConfig::from_env();
    if !config.enabled_on_startup {
        return Ok(None);
    }

    let artifact = backup_mysql_snapshot_with_config(pool, &config).await?;
    info!(
        uri = %artifact.uri,
        database = %artifact.database,
        table_count = artifact.table_count,
        row_count = artifact.row_count,
        "created startup MySQL backup snapshot"
    );
    Ok(Some(artifact))
}

/// Exports all rows from the current MySQL schema into a timestamped local JSON snapshot file.
pub async fn backup_mysql_snapshot(
    pool: &MySqlPool,
    output_dir: impl AsRef<Path>,
) -> Result<PathBuf, AppError> {
    let snapshot = build_snapshot(pool).await?;
    write_snapshot_to_local(&snapshot, output_dir.as_ref()).await
}

/// Exports MySQL data and stores it according to backup configuration.
pub async fn backup_mysql_snapshot_with_config(
    pool: &MySqlPool,
    config: &BackupConfig,
) -> Result<BackupArtifact, AppError> {
    config.validate()?;

    let snapshot = build_snapshot(pool).await?;

    match config.target {
        BackupTarget::LocalFile => {
            let path = write_snapshot_to_local(&snapshot, &config.local_output_dir).await?;
            Ok(BackupArtifact {
                uri: format!("file://{}", path.display()),
                database: snapshot.database,
                table_count: snapshot.table_count,
                row_count: snapshot.row_count,
            })
        }
        BackupTarget::GoogleCloudStorage => {
            let uri = write_snapshot_to_gcs(&snapshot, config).await?;
            Ok(BackupArtifact {
                uri,
                database: snapshot.database,
                table_count: snapshot.table_count,
                row_count: snapshot.row_count,
            })
        }
    }
}

struct SnapshotPayload {
    database: String,
    timestamp: String,
    table_count: usize,
    row_count: u64,
    bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct GoogleAccessTokenResponse {
    access_token: String,
}

async fn build_snapshot(pool: &MySqlPool) -> Result<SnapshotPayload, AppError> {
    let database_name = sqlx::query_scalar::<_, Option<String>>("SELECT DATABASE()")
        .fetch_one(pool)
        .await?
        .unwrap_or_else(|| "unknown".to_string());

    let table_names = sqlx::query_scalar::<_, String>(
        r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut tables = Map::<String, Value>::new();
    let mut total_rows = 0_u64;

    for table_name in &table_names {
        let sql = format!("SELECT * FROM `{}`", table_name);
        let rows = sqlx::query(&sql).fetch_all(pool).await?;
        total_rows += rows.len() as u64;

        let mut json_rows = Vec::<Value>::with_capacity(rows.len());
        for row in &rows {
            json_rows.push(Value::Object(row_to_json_map(row)?));
        }
        tables.insert(table_name.clone(), Value::Array(json_rows));
    }

    let now = Utc::now();
    let payload = serde_json::json!({
        "metadata": {
            "database": database_name,
            "created_at": now.to_rfc3339(),
            "table_count": table_names.len(),
            "row_count": total_rows,
            "format": "mesosphere/mysql-json-backup/v1"
        },
        "tables": tables,
    });

    let bytes = serde_json::to_vec_pretty(&payload).map_err(|error| {
        AppError::internal(format!("failed to serialize backup payload: {}", error))
    })?;

    Ok(SnapshotPayload {
        database: database_name,
        timestamp: now.format("%Y%m%dT%H%M%SZ").to_string(),
        table_count: table_names.len(),
        row_count: total_rows,
        bytes,
    })
}

async fn write_snapshot_to_local(
    snapshot: &SnapshotPayload,
    output_dir: &Path,
) -> Result<PathBuf, AppError> {
    tokio::fs::create_dir_all(output_dir)
        .await
        .map_err(|error| {
            AppError::internal(format!(
                "failed to create backup directory '{}': {}",
                output_dir.display(),
                error
            ))
        })?;

    let backup_path = output_dir.join(format!("mysql-backup-{}.json", snapshot.timestamp));

    tokio::fs::write(&backup_path, &snapshot.bytes)
        .await
        .map_err(|error| {
            AppError::internal(format!(
                "failed to write backup file '{}': {}",
                backup_path.display(),
                error
            ))
        })?;

    Ok(backup_path)
}

async fn write_snapshot_to_gcs(
    snapshot: &SnapshotPayload,
    config: &BackupConfig,
) -> Result<String, AppError> {
    let bucket = config
        .gcs_bucket
        .as_ref()
        .ok_or_else(|| AppError::config("MESOSPHERE_GCS_BACKUP_BUCKET is required"))?;

    let filename = format!("mysql-backup-{}.json", snapshot.timestamp);
    let object_name = if config.gcs_prefix.is_empty() {
        filename
    } else {
        format!("{}/{}", config.gcs_prefix, filename)
    };

    let token = fetch_google_access_token().await?;
    let endpoint = format!(
        "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}",
        urlencoding::encode(bucket),
        urlencoding::encode(&object_name)
    );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| AppError::internal(format!("failed to build http client: {}", error)))?;

    let response = client
        .post(&endpoint)
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .body(snapshot.bytes.clone())
        .send()
        .await
        .map_err(|error| {
            AppError::internal(format!("failed to upload backup to GCS: {}", error))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::internal(format!(
            "GCS upload failed with status {}: {}",
            status, body
        )));
    }

    Ok(format!("gs://{}/{}", bucket, object_name))
}

async fn fetch_google_access_token() -> Result<String, AppError> {
    if let Ok(token) = env::var("MESOSPHERE_GCP_ACCESS_TOKEN") {
        if !token.trim().is_empty() {
            return Ok(token);
        }
    }

    let token_endpoint = env::var("MESOSPHERE_GCP_METADATA_TOKEN_URL").unwrap_or_else(|_| {
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
            .to_string()
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| AppError::internal(format!("failed to build http client: {}", error)))?;

    let response = client
        .get(&token_endpoint)
        .header("Metadata-Flavor", "Google")
        .send()
        .await
        .map_err(|error| {
            AppError::internal(format!(
                "failed to query GCP metadata token endpoint '{}': {}",
                token_endpoint, error
            ))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::internal(format!(
            "metadata token request failed with status {}: {}",
            status, body
        )));
    }

    let payload: GoogleAccessTokenResponse = response.json().await.map_err(|error| {
        AppError::internal(format!("invalid metadata token response: {}", error))
    })?;

    if payload.access_token.trim().is_empty() {
        return Err(AppError::internal(
            "metadata token response did not contain an access_token",
        ));
    }

    Ok(payload.access_token)
}

fn row_to_json_map(row: &MySqlRow) -> Result<Map<String, Value>, AppError> {
    let mut map = Map::<String, Value>::new();

    for column in row.columns() {
        let column_name = column.name();

        if let Ok(value) = row.try_get::<Option<sqlx::types::Json<Value>>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value.map(|json| json.0).unwrap_or(Value::Null),
            );
            continue;
        }

        if let Ok(value) = row.try_get::<Option<String>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value.map(Value::String).unwrap_or(Value::Null),
            );
            continue;
        }

        if let Ok(value) = row.try_get::<Option<f64>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .and_then(serde_json::Number::from_f64)
                    .map(Value::Number)
                    .unwrap_or(Value::Null),
            );
            continue;
        }

        if let Ok(value) = row.try_get::<Option<i64>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(serde_json::Number::from)
                    .map(Value::Number)
                    .unwrap_or(Value::Null),
            );
            continue;
        }

        if let Ok(value) = row.try_get::<Option<i8>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(|flag| Value::Bool(flag != 0))
                    .unwrap_or(Value::Null),
            );
            continue;
        }

        if let Ok(value) = row.try_get::<Option<chrono::NaiveDateTime>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(|datetime| Value::String(datetime.to_string()))
                    .unwrap_or(Value::Null),
            );
            continue;
        }

        if let Ok(value) = row.try_get::<Option<Vec<u8>>, _>(column_name) {
            map.insert(
                column_name.to_string(),
                value
                    .map(|bytes| Value::String(bytes_to_hex(&bytes)))
                    .unwrap_or(Value::Null),
            );
            continue;
        }

        map.insert(column_name.to_string(), Value::Null);
    }

    Ok(map)
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push_str(&format!("{:02x}", byte));
    }
    output
}

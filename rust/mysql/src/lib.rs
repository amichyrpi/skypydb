use mesosphere_errors::AppError;
use sqlx::MySqlPool;

/// Runs idempotent bootstrap migrations for system and vector tables.
pub async fn run_bootstrap_migrations(pool: &MySqlPool) -> Result<(), AppError> {
    let mut transaction = pool.begin().await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _mesosphere_schema_meta (
            table_name VARCHAR(255) PRIMARY KEY,
            signature TEXT NOT NULL,
            managed BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _mesosphere_schema_state (
            key_name VARCHAR(255) PRIMARY KEY,
            value_json JSON NOT NULL,
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _mesosphere_schema_migrations (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL,
            applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            details JSON NULL
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS vector_collections (
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            metadata JSON NULL,
            _created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            _updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS vector_items (
            id CHAR(36) PRIMARY KEY,
            collection_id CHAR(36) NOT NULL,
            embedding_blob LONGBLOB NOT NULL,
            embedding_dim INT NOT NULL,
            embedding_norm DOUBLE NOT NULL,
            document TEXT NULL,
            metadata JSON NULL,
            _created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            _updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            CONSTRAINT fk_vector_items_collection
                FOREIGN KEY (collection_id) REFERENCES vector_collections(id)
                ON DELETE CASCADE
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _storage_files (
            id CHAR(36) PRIMARY KEY,
            content_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
            byte_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
            file_path TEXT NOT NULL,
            _created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            _updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _storage_upload_tokens (
            token CHAR(36) PRIMARY KEY,
            storage_id CHAR(36) NOT NULL,
            expires_at DATETIME(6) NOT NULL,
            _created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            CONSTRAINT fk_storage_upload_tokens_storage
                FOREIGN KEY (storage_id) REFERENCES _storage_files(id)
                ON DELETE CASCADE
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _functions_deployments (
            id TINYINT PRIMARY KEY,
            manifest_json LONGTEXT NOT NULL,
            deployment_mode VARCHAR(16) NOT NULL DEFAULT 'local',
            deployed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        )
        "#,
    )
    .execute(&mut *transaction)
    .await?;

    let index_exists = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'vector_items'
          AND index_name = 'idx_vector_items_collection_id'
        "#,
    )
    .fetch_one(&mut *transaction)
    .await?;
    if index_exists == 0 {
        sqlx::query(
            r#"
            CREATE INDEX idx_vector_items_collection_id
            ON vector_items(collection_id)
            "#,
        )
        .execute(&mut *transaction)
        .await?;
    }

    let storage_token_index_exists = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = '_storage_upload_tokens'
          AND index_name = 'idx_storage_upload_tokens_expires_at'
        "#,
    )
    .fetch_one(&mut *transaction)
    .await?;
    if storage_token_index_exists == 0 {
        sqlx::query(
            r#"
            CREATE INDEX idx_storage_upload_tokens_expires_at
            ON _storage_upload_tokens(expires_at)
            "#,
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;
    Ok(())
}

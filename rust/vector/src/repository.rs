use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{MySqlPool, Row};
use tracing::instrument;
use uuid::Uuid;

use crate::codec::{decode_embedding, encode_embedding, vector_norm};
use crate::scoring::cosine_similarity;
use mesosphere_errors::AppError;

/// Vector collection record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorCollectionRecord {
    /// Collection id.
    pub id: String,
    /// Collection name.
    pub name: String,
    /// Metadata JSON.
    pub metadata: Option<Value>,
    /// Created timestamp.
    pub created_at: String,
    /// Updated timestamp.
    pub updated_at: String,
}

/// Vector item payload for insert operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewVectorItem {
    /// Optional item id.
    pub id: Option<String>,
    /// Embedding data.
    pub embedding: Vec<f32>,
    /// Optional document.
    pub document: Option<String>,
    /// Optional metadata.
    pub metadata: Option<Value>,
}

/// Vector item payload for update operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVectorItem {
    /// Existing item id.
    pub id: String,
    /// Optional embedding replacement.
    pub embedding: Option<Vec<f32>>,
    /// Optional document replacement.
    pub document: Option<String>,
    /// Optional metadata replacement.
    pub metadata: Option<Value>,
}

/// Vector item read model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorItemRecord {
    /// Item id.
    pub id: String,
    /// Optional document.
    pub document: Option<String>,
    /// Optional metadata.
    pub metadata: Option<Value>,
}

/// Vector query result payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorQueryResult {
    /// Result ids grouped per query vector.
    pub ids: Vec<Vec<String>>,
    /// Result documents grouped per query vector.
    pub documents: Vec<Vec<Option<String>>>,
    /// Result metadatas grouped per query vector.
    pub metadatas: Vec<Vec<Option<Value>>>,
    /// Result distances grouped per query vector.
    pub distances: Vec<Vec<f64>>,
}

#[derive(Clone)]
pub struct VectorRepository {
    pool: MySqlPool,
    max_dimension: usize,
}

impl VectorRepository {
    /// Creates a vector repository instance.
    pub fn new(pool: MySqlPool, max_dimension: usize) -> Self {
        Self {
            pool,
            max_dimension,
        }
    }

    /// Creates a vector collection.
    #[instrument(skip(self, metadata), fields(collection = name))]
    pub async fn create_collection(
        &self,
        name: &str,
        metadata: Option<Value>,
    ) -> Result<VectorCollectionRecord, AppError> {
        if name.trim().is_empty() {
            return Err(AppError::validation("collection name cannot be empty"));
        }
        let collection_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO vector_collections (id, name, metadata)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(&collection_id)
        .bind(name)
        .bind(metadata.clone().map(sqlx::types::Json))
        .execute(&self.pool)
        .await?;

        self.get_collection_by_name(name)
            .await?
            .ok_or_else(|| AppError::internal("collection insert succeeded but read-back failed"))
    }

    /// Lists all vector collections.
    #[instrument(skip(self))]
    pub async fn list_collections(&self) -> Result<Vec<VectorCollectionRecord>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, metadata, _created_at, _updated_at
            FROM vector_collections
            ORDER BY name ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_collection).collect()
    }

    /// Deletes one collection (and cascade-deletes items).
    #[instrument(skip(self), fields(collection = name))]
    pub async fn delete_collection(&self, name: &str) -> Result<u64, AppError> {
        let result = sqlx::query("DELETE FROM vector_collections WHERE name = ?")
            .bind(name)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    /// Adds items to a collection and returns inserted ids.
    #[instrument(skip(self, items), fields(collection = collection_name, item_count = items.len()))]
    pub async fn add_items(
        &self,
        collection_name: &str,
        items: &[NewVectorItem],
    ) -> Result<Vec<String>, AppError> {
        let collection_id = self.collection_id(collection_name).await?;
        if items.is_empty() {
            return Ok(Vec::new());
        }

        let mut inserted_ids = Vec::<String>::new();
        let mut transaction = self.pool.begin().await?;
        for item in items {
            validate_embedding(&item.embedding, self.max_dimension)?;
            let id = item
                .id
                .clone()
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            let blob = encode_embedding(&item.embedding);
            let norm = vector_norm(&item.embedding);
            sqlx::query(
                r#"
                INSERT INTO vector_items (
                    id,
                    collection_id,
                    embedding_blob,
                    embedding_dim,
                    embedding_norm,
                    document,
                    metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&id)
            .bind(&collection_id)
            .bind(blob)
            .bind(item.embedding.len() as i32)
            .bind(norm)
            .bind(item.document.clone())
            .bind(item.metadata.clone().map(sqlx::types::Json))
            .execute(&mut *transaction)
            .await?;
            inserted_ids.push(id);
        }
        transaction.commit().await?;
        Ok(inserted_ids)
    }

    /// Updates items in a collection and returns affected row count.
    #[instrument(skip(self, items), fields(collection = collection_name, item_count = items.len()))]
    pub async fn update_items(
        &self,
        collection_name: &str,
        items: &[UpdateVectorItem],
    ) -> Result<u64, AppError> {
        let collection_id = self.collection_id(collection_name).await?;
        if items.is_empty() {
            return Ok(0);
        }

        let mut affected = 0_u64;
        let mut transaction = self.pool.begin().await?;
        for item in items {
            if let Some(embedding) = &item.embedding {
                validate_embedding(embedding, self.max_dimension)?;
            }

            let row = sqlx::query(
                r#"
                SELECT embedding_blob, embedding_dim, embedding_norm, document, metadata
                FROM vector_items
                WHERE collection_id = ? AND id = ?
                "#,
            )
            .bind(&collection_id)
            .bind(&item.id)
            .fetch_optional(&mut *transaction)
            .await?;

            let Some(existing) = row else {
                continue;
            };

            let next_embedding = if let Some(embedding) = &item.embedding {
                embedding.clone()
            } else {
                decode_embedding(&existing.try_get::<Vec<u8>, _>("embedding_blob")?)
                    .map_err(AppError::validation)?
            };
            let next_blob = encode_embedding(&next_embedding);
            let next_norm = vector_norm(&next_embedding);
            let next_dim = next_embedding.len() as i32;
            let next_document = item.document.clone().or_else(|| {
                existing
                    .try_get::<Option<String>, _>("document")
                    .ok()
                    .flatten()
            });
            let next_metadata = item.metadata.clone().or_else(|| {
                existing
                    .try_get::<Option<sqlx::types::Json<Value>>, _>("metadata")
                    .ok()
                    .flatten()
                    .map(|json| json.0)
            });

            let result = sqlx::query(
                r#"
                UPDATE vector_items
                SET embedding_blob = ?,
                    embedding_dim = ?,
                    embedding_norm = ?,
                    document = ?,
                    metadata = ?,
                    _updated_at = CURRENT_TIMESTAMP(6)
                WHERE collection_id = ? AND id = ?
                "#,
            )
            .bind(next_blob)
            .bind(next_dim)
            .bind(next_norm)
            .bind(next_document)
            .bind(next_metadata.map(sqlx::types::Json))
            .bind(&collection_id)
            .bind(&item.id)
            .execute(&mut *transaction)
            .await?;
            affected += result.rows_affected();
        }
        transaction.commit().await?;
        Ok(affected)
    }

    /// Deletes items by ids and returns affected row count.
    #[instrument(skip(self, ids), fields(collection = collection_name, item_count = ids.len()))]
    pub async fn delete_items(
        &self,
        collection_name: &str,
        ids: &[String],
    ) -> Result<u64, AppError> {
        let collection_id = self.collection_id(collection_name).await?;
        if ids.is_empty() {
            return Ok(0);
        }

        let placeholders = std::iter::repeat_n("?", ids.len())
            .collect::<Vec<&str>>()
            .join(", ");
        let sql = format!(
            "DELETE FROM vector_items WHERE collection_id = ? AND id IN ({})",
            placeholders
        );
        let mut query = sqlx::query(&sql).bind(collection_id);
        for id in ids {
            query = query.bind(id);
        }
        let result = query.execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    /// Returns items by optional id filter.
    #[instrument(skip(self, ids), fields(collection = collection_name, item_count = ids.len()))]
    pub async fn get_items(
        &self,
        collection_name: &str,
        ids: &[String],
    ) -> Result<Vec<VectorItemRecord>, AppError> {
        let collection_id = self.collection_id(collection_name).await?;
        if ids.is_empty() {
            let rows = sqlx::query(
                r#"
                SELECT id, document, metadata
                FROM vector_items
                WHERE collection_id = ?
                ORDER BY _created_at ASC
                "#,
            )
            .bind(&collection_id)
            .fetch_all(&self.pool)
            .await?;
            return rows.into_iter().map(row_to_item).collect();
        }

        let placeholders = std::iter::repeat_n("?", ids.len())
            .collect::<Vec<&str>>()
            .join(", ");
        let sql = format!(
            "SELECT id, document, metadata FROM vector_items WHERE collection_id = ? AND id IN ({})",
            placeholders
        );
        let mut query = sqlx::query(&sql).bind(collection_id);
        for id in ids {
            query = query.bind(id);
        }
        let rows = query.fetch_all(&self.pool).await?;
        rows.into_iter().map(row_to_item).collect()
    }

    /// Runs cosine-similarity search and returns top-k per query embedding.
    #[instrument(skip(self, query_embeddings), fields(collection = collection_name, query_count = query_embeddings.len(), n_results = n_results))]
    pub async fn query(
        &self,
        collection_name: &str,
        query_embeddings: &[Vec<f32>],
        n_results: u32,
    ) -> Result<VectorQueryResult, AppError> {
        if query_embeddings.is_empty() {
            return Err(AppError::validation("query_embeddings cannot be empty"));
        }
        for embedding in query_embeddings {
            validate_embedding(embedding, self.max_dimension)?;
        }

        let collection_id = self.collection_id(collection_name).await?;
        let rows = sqlx::query(
            r#"
            SELECT id, embedding_blob, embedding_dim, embedding_norm, document, metadata
            FROM vector_items
            WHERE collection_id = ?
            "#,
        )
        .bind(collection_id)
        .fetch_all(&self.pool)
        .await?;

        let candidates = rows
            .into_iter()
            .map(|row| -> Result<VectorCandidate, AppError> {
                let embedding_blob = row.try_get::<Vec<u8>, _>("embedding_blob")?;
                let vector = decode_embedding(&embedding_blob).map_err(AppError::validation)?;
                let embedding_dim = row.try_get::<i32, _>("embedding_dim")? as usize;
                if vector.len() != embedding_dim {
                    return Err(AppError::internal(
                        "vector blob length and embedding_dim mismatch",
                    ));
                }
                Ok(VectorCandidate {
                    id: row.try_get::<String, _>("id")?,
                    vector,
                    norm: row.try_get::<f64, _>("embedding_norm")?,
                    document: row.try_get::<Option<String>, _>("document")?,
                    metadata: row
                        .try_get::<Option<sqlx::types::Json<Value>>, _>("metadata")?
                        .map(|json| json.0),
                })
            })
            .collect::<Result<Vec<VectorCandidate>, AppError>>()?;

        let top_k = n_results.max(1) as usize;
        let mut response_ids = Vec::<Vec<String>>::new();
        let mut response_documents = Vec::<Vec<Option<String>>>::new();
        let mut response_metadatas = Vec::<Vec<Option<Value>>>::new();
        let mut response_distances = Vec::<Vec<f64>>::new();

        for query_embedding in query_embeddings {
            let mut scored = candidates
                .iter()
                .filter(|candidate| candidate.vector.len() == query_embedding.len())
                .map(|candidate| {
                    let similarity =
                        cosine_similarity(query_embedding, &candidate.vector, candidate.norm);
                    (candidate, similarity)
                })
                .collect::<Vec<(&VectorCandidate, f64)>>();

            scored.sort_by(|left, right| {
                right
                    .1
                    .partial_cmp(&left.1)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            scored.truncate(top_k);

            response_ids.push(
                scored
                    .iter()
                    .map(|(candidate, _)| candidate.id.clone())
                    .collect(),
            );
            response_documents.push(
                scored
                    .iter()
                    .map(|(candidate, _)| candidate.document.clone())
                    .collect(),
            );
            response_metadatas.push(
                scored
                    .iter()
                    .map(|(candidate, _)| candidate.metadata.clone())
                    .collect(),
            );
            response_distances.push(
                scored
                    .iter()
                    .map(|(_, similarity)| 1.0 - similarity)
                    .collect(),
            );
        }

        Ok(VectorQueryResult {
            ids: response_ids,
            documents: response_documents,
            metadatas: response_metadatas,
            distances: response_distances,
        })
    }

    async fn get_collection_by_name(
        &self,
        name: &str,
    ) -> Result<Option<VectorCollectionRecord>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT id, name, metadata, _created_at, _updated_at
            FROM vector_collections
            WHERE name = ?
            "#,
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;
        row.map(row_to_collection).transpose()
    }

    async fn collection_id(&self, collection_name: &str) -> Result<String, AppError> {
        self.get_collection_by_name(collection_name)
            .await?
            .map(|collection| collection.id)
            .ok_or_else(|| {
                AppError::not_found(format!("collection '{}' not found", collection_name))
            })
    }
}

struct VectorCandidate {
    id: String,
    vector: Vec<f32>,
    norm: f64,
    document: Option<String>,
    metadata: Option<Value>,
}

fn validate_embedding(embedding: &[f32], max_dimension: usize) -> Result<(), AppError> {
    if embedding.is_empty() {
        return Err(AppError::validation("embedding cannot be empty"));
    }
    if embedding.len() > max_dimension {
        return Err(AppError::validation(format!(
            "embedding dimension {} exceeds configured max {}",
            embedding.len(),
            max_dimension
        )));
    }
    Ok(())
}

fn row_to_collection(row: sqlx::mysql::MySqlRow) -> Result<VectorCollectionRecord, AppError> {
    Ok(VectorCollectionRecord {
        id: row.try_get::<String, _>("id")?,
        name: row.try_get::<String, _>("name")?,
        metadata: row
            .try_get::<Option<sqlx::types::Json<Value>>, _>("metadata")?
            .map(|json| json.0),
        created_at: row
            .try_get::<chrono::NaiveDateTime, _>("_created_at")
            .map(|value| value.to_string())
            .unwrap_or_default(),
        updated_at: row
            .try_get::<chrono::NaiveDateTime, _>("_updated_at")
            .map(|value| value.to_string())
            .unwrap_or_default(),
    })
}

fn row_to_item(row: sqlx::mysql::MySqlRow) -> Result<VectorItemRecord, AppError> {
    Ok(VectorItemRecord {
        id: row.try_get::<String, _>("id")?,
        document: row.try_get::<Option<String>, _>("document")?,
        metadata: row
            .try_get::<Option<sqlx::types::Json<Value>>, _>("metadata")?
            .map(|json| json.0),
    })
}

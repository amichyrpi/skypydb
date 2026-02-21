use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Create-collection request payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCollectionRequest {
    /// Unique collection name.
    pub name: String,
    /// Optional collection metadata JSON.
    #[serde(default)]
    pub metadata: Option<Value>,
}

/// Vector collection descriptor.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionResponse {
    /// Collection id.
    pub id: String,
    /// Collection name.
    pub name: String,
    /// Collection metadata.
    pub metadata: Option<Value>,
    /// Creation timestamp.
    pub created_at: String,
    /// Last update timestamp.
    pub updated_at: String,
}

/// Item payload used for vector insert operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorItemInput {
    /// Optional item id (generated when omitted).
    #[serde(default)]
    pub id: Option<String>,
    /// Embedding vector values.
    pub embedding: Vec<f32>,
    /// Optional document text.
    #[serde(default)]
    pub document: Option<String>,
    /// Optional metadata JSON.
    #[serde(default)]
    pub metadata: Option<Value>,
}

/// Item payload used for vector update operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorItemUpdate {
    /// Existing item id.
    pub id: String,
    /// Optional replacement embedding.
    #[serde(default)]
    pub embedding: Option<Vec<f32>>,
    /// Optional replacement document.
    #[serde(default)]
    pub document: Option<String>,
    /// Optional replacement metadata.
    #[serde(default)]
    pub metadata: Option<Value>,
}

/// Add-item request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorAddItemsRequest {
    /// Items to persist.
    pub items: Vec<VectorItemInput>,
}

/// Update-item request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorUpdateItemsRequest {
    /// Items to update by id.
    pub items: Vec<VectorItemUpdate>,
}

/// Delete-item request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorDeleteItemsRequest {
    /// Item ids to delete.
    #[serde(default)]
    pub ids: Vec<String>,
}

/// Get-item request body.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VectorGetItemsRequest {
    /// Optional ids filter.
    #[serde(default)]
    pub ids: Vec<String>,
}

/// Vector query request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorQueryRequest {
    /// Query vectors.
    pub query_embeddings: Vec<Vec<f32>>,
    /// Top-k results per query.
    #[serde(default)]
    pub n_results: Option<u32>,
}

/// Vector item response payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorItemResponse {
    /// Item id.
    pub id: String,
    /// Optional document text.
    pub document: Option<String>,
    /// Optional metadata JSON.
    pub metadata: Option<Value>,
}

/// Vector query response payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorQueryResponse {
    /// Result ids grouped by query index.
    pub ids: Vec<Vec<String>>,
    /// Result documents grouped by query index.
    pub documents: Vec<Vec<Option<String>>>,
    /// Result metadata grouped by query index.
    pub metadatas: Vec<Vec<Option<Value>>>,
    /// Result distances grouped by query index.
    pub distances: Vec<Vec<f64>>,
}

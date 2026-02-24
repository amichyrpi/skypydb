use serde::{Deserialize, Serialize};

/// Response payload returned after successfully uploading a storage object.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageUploadResponse {
    /// Stable storage object id (compatible with value.id("_storage")).
    pub storage_id: String,
}


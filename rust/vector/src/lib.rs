mod codec;
mod scoring;

/// Vector endpoint request/response models.
pub mod api_models;
/// Vector persistence and query repository.
pub mod repository;
/// Vector route handlers.
pub mod routes;

pub use codec::{decode_embedding, encode_embedding, vector_norm};
pub use scoring::cosine_similarity;

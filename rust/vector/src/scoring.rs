/// Computes cosine similarity between query and item vectors using precomputed item norm.
pub fn cosine_similarity(query: &[f32], item: &[f32], item_norm: f64) -> f64 {
    if query.len() != item.len() || query.is_empty() || item_norm == 0.0 {
        return 0.0;
    }

    let mut dot = 0.0_f64;
    let mut query_squared = 0.0_f64;
    for (query_value, item_value) in query.iter().zip(item.iter()) {
        let q = *query_value as f64;
        let i = *item_value as f64;
        dot += q * i;
        query_squared += q * q;
    }

    let query_norm = query_squared.sqrt();
    if query_norm == 0.0 {
        return 0.0;
    }

    dot / (query_norm * item_norm)
}

/// Encodes a vector of `f32` values into a compact little-endian byte buffer.
pub fn encode_embedding(values: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(std::mem::size_of_val(values));
    for value in values {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes
}

/// Decodes a little-endian byte buffer into `f32` values.
pub fn decode_embedding(bytes: &[u8]) -> Result<Vec<f32>, String> {
    if bytes.len() % std::mem::size_of::<f32>() != 0 {
        return Err("embedding blob length is not a multiple of 4".to_string());
    }

    let mut output = Vec::with_capacity(bytes.len() / std::mem::size_of::<f32>());
    for chunk in bytes.chunks_exact(std::mem::size_of::<f32>()) {
        output.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
    }
    Ok(output)
}

/// Computes the Euclidean norm for a vector.
pub fn vector_norm(values: &[f32]) -> f64 {
    let squared_sum = values
        .iter()
        .map(|value| {
            let f64_value = *value as f64;
            f64_value * f64_value
        })
        .sum::<f64>();
    squared_sum.sqrt()
}

#[cfg(test)]
mod tests {
    use super::{decode_embedding, encode_embedding, vector_norm};

    #[test]
    fn round_trip_codec_and_norm() {
        let values = vec![1.0_f32, 2.5_f32, -3.25_f32];
        let encoded = encode_embedding(&values);
        let decoded = decode_embedding(&encoded).expect("decode should work");
        assert_eq!(values, decoded);
        assert!(vector_norm(&values) > 0.0);
    }
}

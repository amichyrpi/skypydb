export function cosine_similarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(
      `Vector dimensions don't match: ${vec1.length} vs ${vec2.length}`,
    );
  }

  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let index = 0; index < vec1.length; index += 1) {
    const a = vec1[index];
    const b = vec2[index];
    dot += a * b;
    norm1 += a * a;
    norm2 += b * b;
  }
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export function euclidean_distance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(
      `Vector dimensions don't match: ${vec1.length} vs ${vec2.length}`,
    );
  }
  let sum = 0;
  for (let index = 0; index < vec1.length; index += 1) {
    const delta = vec1[index] - vec2[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

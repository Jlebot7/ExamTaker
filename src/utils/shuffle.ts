/**
 * High-entropy Fisher-Yates (Knuth) shuffle algorithm.
 * Guarantees uniform random distribution across student terminals.
 */
export function shuffleArray<T>(array: T[]): T[] {
  if (!array || array.length <= 1) {
    return array ? [...array] : [];
  }

  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    let randIndex: number;

    // Use cryptographically secure random values when available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      randIndex = buffer[0] % (i + 1);
    } else {
      randIndex = Math.floor(Math.random() * (i + 1));
    }

    // Swap elements
    const temp = result[i];
    result[i] = result[randIndex];
    result[randIndex] = temp;
  }

  return result;
}


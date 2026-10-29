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

/** 32-bit FNV-1a string hashing for deterministic pseudorandom seeds */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG generator */
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle using a reproducible seed.
 * Guarantees that the same student and question receive the same option order across page reloads (F5),
 * while students on adjacent terminals receive completely distinct permutations.
 */
export function shuffleWithSeed<T>(array: T[], seedStr: string): T[] {
  if (!array || array.length <= 1) {
    return array ? [...array] : [];
  }

  const rng = mulberry32(hashString(seedStr));
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const randIndex = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[randIndex];
    result[randIndex] = temp;
  }

  return result;
}

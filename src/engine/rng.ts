/**
 * Seedable, deterministic pseudo-random number generator.
 *
 * Determinism is a hard requirement: drills and unit tests must be able to
 * replay the exact same shoe from a seed. We use mulberry32 (a small, fast,
 * well-distributed 32-bit PRNG) seeded via the xmur3 string hash so seeds can
 * be human-friendly strings or numbers.
 *
 * Not cryptographically secure — and it doesn't need to be.
 */

export interface Rng {
  /** Next float in the half-open interval [0, 1). */
  next(): number
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number
}

/** xmur3 string hash → seed generator producing 32-bit seeds. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** mulberry32 PRNG: fast, deterministic, good enough for shuffling. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Create a deterministic RNG from a string or number seed.
 * The same seed always yields the same sequence.
 */
export function createRng(seed: number | string): Rng {
  const seedStr = typeof seed === 'number' ? String(seed) : seed
  const seedFn = xmur3(seedStr)
  const nextFloat = mulberry32(seedFn())

  return {
    next: nextFloat,
    int(maxExclusive: number): number {
      if (maxExclusive <= 0) {
        throw new RangeError(`maxExclusive must be > 0, got ${maxExclusive}`)
      }
      return Math.floor(nextFloat() * maxExclusive)
    },
  }
}

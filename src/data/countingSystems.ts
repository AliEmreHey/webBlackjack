/**
 * Counting systems as DATA, not logic.
 *
 * A system is just a rank→value table plus metadata. Adding KO, Hi-Opt II,
 * Omega II, etc. later means appending another entry here — the count engine
 * (src/engine/count.ts) never changes.
 */

import type { Rank } from '../engine/types'

export interface CountingSystem {
  /** Stable identifier used in settings/persistence. */
  readonly id: string
  /** Human-readable name. */
  readonly name: string
  /**
   * Balanced systems sum to exactly 0 over a full deck, which is what makes
   * the running→true count division meaningful. Unbalanced systems (e.g. KO)
   * use a running-count threshold instead.
   */
  readonly balanced: boolean
  /** Point value contributed by each rank when it is seen. */
  readonly values: Readonly<Record<Rank, number>>
}

/**
 * Hi-Lo (Harvey Dubner / Edward Thorp lineage). Balanced.
 * 2–6 = +1, 7–9 = 0, 10/J/Q/K/A = −1. Verified in RESEARCH.md §1.
 */
export const HI_LO: CountingSystem = {
  id: 'hi-lo',
  name: 'Hi-Lo',
  balanced: true,
  values: {
    '2': 1,
    '3': 1,
    '4': 1,
    '5': 1,
    '6': 1,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': -1,
    J: -1,
    Q: -1,
    K: -1,
    A: -1,
  },
}

/** Registry of available systems, keyed by id. Hi-Lo only for now. */
export const COUNTING_SYSTEMS: Readonly<Record<string, CountingSystem>> = {
  [HI_LO.id]: HI_LO,
}

export const DEFAULT_COUNTING_SYSTEM = HI_LO

/**
 * Card-counting math: running count, decks-remaining estimate, true count.
 *
 * The system is injected as data (see src/data/countingSystems.ts), so this
 * module is identical for Hi-Lo, KO, Hi-Opt II, etc.
 *
 * Reference values and the rounding rationale are documented in RESEARCH.md
 * §1–§2.
 */

import type { CountingSystem } from '../data/countingSystems'
import { CARDS_PER_DECK } from './shoe'
import type { Card, Rank } from './types'

/**
 * How a player estimates "decks remaining" from the discard tray.
 * - `exact`   — cardsRemaining / 52 (engine-precise)
 * - `half`    — rounded to the nearest half deck (common at the table)
 * - `quarter` — rounded to the nearest quarter deck (more granular)
 */
export type DeckRoundingMode = 'exact' | 'half' | 'quarter'

/** Count contribution of a single rank under the given system. */
export function cardCountValue(system: CountingSystem, rank: Rank): number {
  return system.values[rank]
}

/** Running count: the signed sum of all dealt cards' values. */
export function runningCount(
  system: CountingSystem,
  dealtCards: readonly Card[],
): number {
  let count = 0
  for (const card of dealtCards) {
    count += system.values[card.rank]
  }
  return count
}

/**
 * Estimate decks remaining from the count of undealt cards.
 *
 * For the rounded modes we snap to the nearest increment but never return 0
 * while cards remain — a counter always perceives "at least a little" left,
 * and it keeps the true-count division finite. Returns exactly 0 only when no
 * cards remain.
 */
export function estimateDecksRemaining(
  cardsRemaining: number,
  mode: DeckRoundingMode = 'exact',
): number {
  if (cardsRemaining <= 0) return 0
  const exact = cardsRemaining / CARDS_PER_DECK
  switch (mode) {
    case 'exact':
      return exact
    case 'half':
      return Math.max(0.5, Math.round(exact * 2) / 2)
    case 'quarter':
      return Math.max(0.25, Math.round(exact * 4) / 4)
  }
}

/**
 * True count = running count ÷ decks remaining.
 *
 * Returns 0 when no decks remain (no meaningful count to report). The caller
 * supplies `decksRemaining` (typically via {@link estimateDecksRemaining}),
 * which is clamped > 0 while cards remain, so this never divides by zero.
 */
export function trueCount(
  runningCountValue: number,
  decksRemaining: number,
): number {
  if (decksRemaining <= 0) return 0
  return runningCountValue / decksRemaining
}

export interface CountState {
  readonly running: number
  readonly decksRemaining: number
  readonly true: number
}

/**
 * Convenience: compute the full count state in one call.
 *
 * `runningCountValue` and `cardsRemaining` come from the live game/shoe; we
 * keep the engine the single source of truth rather than recomputing here.
 */
export function computeCountState(
  runningCountValue: number,
  cardsRemaining: number,
  mode: DeckRoundingMode = 'exact',
): CountState {
  const decksRemaining = estimateDecksRemaining(cardsRemaining, mode)
  return {
    running: runningCountValue,
    decksRemaining,
    true: trueCount(runningCountValue, decksRemaining),
  }
}

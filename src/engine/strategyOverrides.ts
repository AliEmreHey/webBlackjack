/**
 * A user's custom playing strategy, organised by COUNT REGIME so it can be
 * edited as three readable charts instead of a fiddly per-cell form:
 *
 *   base — your everyday chart (between the thresholds)
 *   high — what you do instead once the true count is ≥ highThreshold
 *   low  — what you do instead once the true count is ≤ lowThreshold
 *
 * Each is a sparse map of chart cell → action code; any cell left unset falls
 * through (high/low → base → the built-in Optimal play). Keyed identically by
 * the chart UI (which edits) and the simulator (which reads), so they never drift.
 */

import { cardValue } from './cards'
import { evaluateHand, isPair } from './hand'
import { dealerUpcardValue } from './strategy'
import type { StrategyCode } from '../data/basicStrategy'
import type { Card, Rank } from './types'

export type HandType = 'hard' | 'soft' | 'pair'

/** Count regime a chart edit belongs to. */
export type Regime = 'base' | 'high' | 'low'

/** Sparse map of chart cell → action code for one regime. */
export type RegimeMap = Record<string, StrategyCode>

export interface CustomStrategy {
  /** Use the `high` chart when the true count is ≥ this. */
  highThreshold: number
  /** Use the `low` chart when the true count is ≤ this. */
  lowThreshold: number
  base: RegimeMap
  high: RegimeMap
  low: RegimeMap
}

export const EMPTY_CUSTOM: CustomStrategy = {
  highThreshold: 2,
  lowThreshold: -2,
  base: {},
  high: {},
  low: {},
}

/** Build the stable key for a chart cell / hand decision. */
export function cellKey(
  handType: HandType,
  value: number,
  dealerUpcard: number,
): string {
  return `${handType}:${value}:${dealerUpcard}`
}

/**
 * The cell key for a live hand decision, or null when the hand falls outside
 * the editable chart (hard ≤7 / ≥17, soft ≤12 / ≥21) — those aren't overridable.
 */
export function handCellKey(
  cards: readonly Card[],
  dealerRank: Rank,
  canSplit: boolean,
): string | null {
  const upcard = dealerUpcardValue(dealerRank)

  if (canSplit && cards.length === 2 && isPair(cards)) {
    return cellKey('pair', cardValue(cards[0]!.rank), upcard)
  }

  const { total, soft } = evaluateHand(cards)
  if (soft) {
    if (total < 13 || total > 20) return null
    return cellKey('soft', total, upcard)
  }
  if (total < 8 || total > 16) return null
  return cellKey('hard', total, upcard)
}

/**
 * Resolve the action code for a cell at a given true count, or undefined when
 * the user hasn't set this cell (caller falls back to Optimal). High regime
 * wins over low; both fall back to base.
 */
export function customCodeFor(
  strategy: CustomStrategy,
  key: string,
  trueCount: number,
): StrategyCode | undefined {
  if (trueCount >= strategy.highThreshold && strategy.high[key]) {
    return strategy.high[key]
  }
  if (trueCount <= strategy.lowThreshold && strategy.low[key]) {
    return strategy.low[key]
  }
  return strategy.base[key]
}

import {
  type BetLevel,
  type BettingStrategy,
  betForTrueCount,
} from '../../data/bettingStrategy'

/** True-count rows shown in the ramp editor; tails (≤ first, ≥ last) are clamped. */
export const EDITOR_RANGE = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const

/** Expand any strategy into one bet per editor row. */
export function densify(strategy: BettingStrategy): BetLevel[] {
  return EDITOR_RANGE.map((trueCount) => ({
    trueCount,
    bet: betForTrueCount(strategy, trueCount),
  }))
}

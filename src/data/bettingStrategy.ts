/**
 * Betting strategies as DATA: a ramp mapping (floored) true count → euro bet.
 *
 * A strategy is a list of levels sorted ascending by true count. To find the
 * bet for a given true count we take the highest level whose `trueCount` is
 * ≤ the (floored) count; counts below the first level use the first level's
 * bet, counts above the last use the last (the tails are clamped). This lets a
 * user bet *less* at negative counts and ramp up as the count climbs, with any
 * euro amount per level — exactly the hand-tuned ramp a counter designs.
 *
 * All amounts are in euros.
 */

export interface BetLevel {
  /** Floored true count at which this bet takes effect. */
  readonly trueCount: number
  /** Euro amount to bet at this level. */
  readonly bet: number
}

export interface BettingStrategy {
  readonly name: string
  /** Non-empty, ascending by trueCount. */
  readonly levels: readonly BetLevel[]
}

/** Flat betting — the control. Counting can't help you if bets never vary. */
export const FLAT: BettingStrategy = {
  name: 'Flat €10',
  levels: [{ trueCount: 0, bet: 10 }],
}

/**
 * The gentle, hand-tuned ramp from our discussion: bet less when cold, base
 * €10 around neutral, climb as the count rises.
 */
export const GENTLE_RAMP: BettingStrategy = {
  name: 'Gentle ramp',
  levels: [
    { trueCount: -2, bet: 5 },
    { trueCount: -1, bet: 10 },
    { trueCount: 2, bet: 12 },
    { trueCount: 3, bet: 20 },
    { trueCount: 4, bet: 30 },
    { trueCount: 5, bet: 40 },
  ],
}

/** Conservative 1–8 spread on a €10 base. Lower variance, lower bust risk. */
export const CONSERVATIVE_1_8: BettingStrategy = {
  name: 'Conservative 1–8',
  levels: [
    { trueCount: 1, bet: 10 },
    { trueCount: 2, bet: 20 },
    { trueCount: 3, bet: 40 },
    { trueCount: 4, bet: 60 },
    { trueCount: 5, bet: 80 },
  ],
}

/** Aggressive 1–16 spread. Higher expected gain, much higher swings/ruin. */
export const AGGRESSIVE_1_16: BettingStrategy = {
  name: 'Aggressive 1–16',
  levels: [
    { trueCount: 1, bet: 10 },
    { trueCount: 2, bet: 40 },
    { trueCount: 3, bet: 80 },
    { trueCount: 4, bet: 120 },
    { trueCount: 5, bet: 160 },
  ],
}

export const BETTING_PRESETS: readonly BettingStrategy[] = [
  FLAT,
  GENTLE_RAMP,
  CONSERVATIVE_1_8,
  AGGRESSIVE_1_16,
]

/** The smallest bet the strategy ever places (its table minimum). */
export function minBet(strategy: BettingStrategy): number {
  return Math.min(...strategy.levels.map((l) => l.bet))
}

/**
 * Bet (euros) for a given true count. The count is floored (standard betting
 * practice), then matched to the highest level ≤ it; tails are clamped.
 */
export function betForTrueCount(
  strategy: BettingStrategy,
  trueCount: number,
): number {
  const tc = Math.floor(trueCount)
  const levels = strategy.levels
  let bet = levels[0]!.bet
  for (const level of levels) {
    if (tc >= level.trueCount) bet = level.bet
    else break
  }
  return bet
}

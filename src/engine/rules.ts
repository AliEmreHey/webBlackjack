/**
 * Configurable table rules. Defaults match the project spec / RESEARCH.md:
 * 6 decks, dealer stands on soft 17, 3:2 blackjack, double after split,
 * late surrender, ~75% penetration.
 */

export interface TableRules {
  /** Number of decks in the shoe (1–8). */
  readonly decks: number
  /** True = dealer hits soft 17 (H17); false = stands (S17). */
  readonly dealerHitsSoft17: boolean
  /** Blackjack payout multiple: 1.5 = 3:2, 1.2 = 6:5. */
  readonly blackjackPayout: number
  /** Doubling allowed after a split. */
  readonly doubleAfterSplit: boolean
  /** Late surrender offered. */
  readonly lateSurrender: boolean
  /** Fraction of the shoe dealt before reshuffle, in (0, 1]. */
  readonly penetration: number
  /** Max number of hands a player may split to (e.g. 4). */
  readonly maxSplitHands: number
}

export const DEFAULT_RULES: TableRules = {
  decks: 6,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  doubleAfterSplit: true,
  lateSurrender: true,
  penetration: 0.75,
  maxSplitHands: 4,
}

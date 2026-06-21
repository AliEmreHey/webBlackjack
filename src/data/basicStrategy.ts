/**
 * Basic-strategy tables as DATA — transcribed cell-for-cell from RESEARCH.md §3
 * for the default rule set: 6 decks, dealer stands on soft 17 (S17), double
 * after split allowed, late surrender, dealer peeks.
 *
 * Codes (resolved to concrete actions in src/engine/strategy.ts):
 *   H  = hit
 *   S  = stand
 *   D  = double if allowed, else hit
 *   Ds = double if allowed, else stand
 *   P  = split
 *   Rh = surrender if allowed, else hit
 *
 * Each row lists 10 codes aligned to DEALER_UPCARDS below.
 */

export type StrategyCode = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'Rh'

/** Dealer upcard values, in column order. 11 represents an Ace. */
export const DEALER_UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
export type DealerUpcardValue = (typeof DEALER_UPCARDS)[number]

/** Column index for a dealer upcard value (Ace=11 → last column). */
export function dealerColumn(upcard: DealerUpcardValue): number {
  return upcard === 11 ? 9 : upcard - 2
}

// Rows below are written left→right as dealer 2,3,4,5,6,7,8,9,10,A.

/** Hard totals. Totals ≤7 always hit; ≥17 always stand (handled in lookup). */
export const HARD_STRATEGY: Readonly<Record<number, readonly StrategyCode[]>> = {
  8: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  9: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
  12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Rh', 'H'],
  16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'Rh', 'Rh', 'Rh'],
}

/**
 * Soft totals keyed by total (A,2=13 … A,9=20). Soft ≤12 is just A + low,
 * resolved by the lookup; soft ≥20 always stands.
 */
export const SOFT_STRATEGY: Readonly<Record<number, readonly StrategyCode[]>> = {
  13: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,2
  14: ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,3
  15: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,4
  16: ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,5
  17: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'], // A,6
  18: ['S', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'], // A,7
  19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'], // A,8
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'], // A,9
}

/**
 * Pairs keyed by the pair's card value (2…10, and 11 for A,A).
 * Non-P codes mean "do not split — play it this way" (e.g. 5,5 doubles,
 * 9,9 stands vs 7/10/A).
 */
export const PAIR_STRATEGY: Readonly<Record<number, readonly StrategyCode[]>> = {
  2: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  3: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  4: ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  5: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  6: ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  7: ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  8: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  9: ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
  10: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  11: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
}

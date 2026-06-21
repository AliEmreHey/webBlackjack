/**
 * Core card/game value types shared across the engine.
 * Pure data — no DOM, no framework, no behaviour.
 */

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'

/** Card ranks. Tens and faces are distinct ranks but share a value of 10. */
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'

export interface Card {
  readonly rank: Rank
  readonly suit: Suit
}

/** Concrete player actions a strategy lookup can recommend. */
export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'

/** All four suits, in a fixed order for deterministic deck building. */
export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

/** All thirteen ranks, in ascending order. */
export const RANKS: readonly Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
]

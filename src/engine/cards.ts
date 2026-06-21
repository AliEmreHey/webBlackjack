/**
 * Deck construction and card value helpers. Pure functions only.
 */

import { type Card, type Rank, RANKS, SUITS } from './types'

/**
 * Blackjack value of a rank's pip. Aces return 11 here; the soft/hard
 * adjustment (counting an ace as 1) lives in hand evaluation, not here.
 */
export function cardValue(rank: Rank): number {
  switch (rank) {
    case 'A':
      return 11
    case 'K':
    case 'Q':
    case 'J':
    case '10':
      return 10
    default:
      return Number(rank)
  }
}

/** True for 10, J, Q, K — all the ten-valued ranks. */
export function isTenValue(rank: Rank): boolean {
  return cardValue(rank) === 10
}

/** Build a single ordered 52-card deck (suits × ranks). */
export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

/** Build `decks` ordered decks concatenated — the raw, unshuffled shoe. */
export function buildShoeCards(decks: number): Card[] {
  if (!Number.isInteger(decks) || decks < 1) {
    throw new RangeError(`decks must be a positive integer, got ${decks}`)
  }
  const cards: Card[] = []
  for (let i = 0; i < decks; i++) {
    cards.push(...buildDeck())
  }
  return cards
}

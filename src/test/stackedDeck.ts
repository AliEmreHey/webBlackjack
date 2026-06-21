import type { CardSource } from '../engine/shoe'
import type { Card, Rank, Suit } from '../engine/types'

/** Deterministic card source for tests: deals from a fixed, known order. */
export class StackedDeck implements CardSource {
  private i = 0
  private readonly cards: Card[]
  constructor(cards: Card[]) {
    this.cards = cards
  }
  get cardsRemaining(): number {
    return this.cards.length - this.i
  }
  get needsReshuffle(): boolean {
    return false
  }
  reshuffle(): void {
    this.i = 0
  }
  deal(): Card {
    const card = this.cards[this.i]
    if (!card) throw new Error('stacked deck exhausted')
    this.i++
    return card
  }
}

/** Card shorthand for tests; suit defaults to spades. */
export const c = (rank: Rank, suit: Suit = 'spades'): Card => ({ rank, suit })

/**
 * The shoe: a multi-deck stack of cards that is shuffled, dealt from, and
 * reshuffled once a configurable penetration (cut-card) point is reached.
 *
 * Encapsulates a dealing cursor for O(1) deals. Determinism comes entirely
 * from the injected {@link Rng}, so a given seed replays an identical shoe.
 */

import { buildShoeCards } from './cards'
import type { Rng } from './rng'
import type { Card } from './types'

const CARDS_PER_DECK = 52

/**
 * Anything the game can deal cards from. {@link Shoe} is the production
 * implementation; tests can supply a stacked deck for deterministic scenarios.
 */
export interface CardSource {
  deal(): Card
  readonly cardsRemaining: number
  readonly needsReshuffle: boolean
  reshuffle(): void
}

export interface ShoeConfig {
  /** Number of decks (1–8 typical). */
  readonly decks: number
  /**
   * Fraction of the shoe dealt before the cut card triggers a reshuffle,
   * in (0, 1]. e.g. 0.75 ≈ 75% penetration.
   */
  readonly penetration: number
  /** Deterministic RNG used for shuffling. */
  readonly rng: Rng
}

export class Shoe implements CardSource {
  readonly decks: number
  readonly penetration: number

  private readonly rng: Rng
  private cards: Card[]
  /** Index of the next card to deal. */
  private cursor = 0
  /** Cards dealt-count at/after which a reshuffle is due. */
  private cutCard: number

  constructor(config: ShoeConfig) {
    const { decks, penetration, rng } = config
    if (penetration <= 0 || penetration > 1) {
      throw new RangeError(
        `penetration must be in (0, 1], got ${penetration}`,
      )
    }
    this.decks = decks
    this.penetration = penetration
    this.rng = rng
    this.cards = buildShoeCards(decks)
    this.cutCard = Math.floor(this.cards.length * penetration)
    this.shuffle()
  }

  /** Total cards in a full shoe (dealt + remaining). */
  get size(): number {
    return this.cards.length
  }

  /** Cards dealt since the last shuffle. */
  get cardsDealt(): number {
    return this.cursor
  }

  /** Cards still available to deal before the shoe is exhausted. */
  get cardsRemaining(): number {
    return this.cards.length - this.cursor
  }

  /** True once the cut card is reached — the current round should be the last. */
  get needsReshuffle(): boolean {
    return this.cursor >= this.cutCard
  }

  /** In-place Fisher–Yates shuffle and cursor reset. */
  shuffle(): void {
    const c = this.cards
    for (let i = c.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1)
      const tmp = c[i]!
      c[i] = c[j]!
      c[j] = tmp
    }
    this.cursor = 0
  }

  /** Rebuild a fresh full shoe and shuffle it. */
  reshuffle(): void {
    this.cards = buildShoeCards(this.decks)
    this.cutCard = Math.floor(this.cards.length * this.penetration)
    this.shuffle()
  }

  /** Deal the next card. Throws if the shoe is physically exhausted. */
  deal(): Card {
    if (this.cursor >= this.cards.length) {
      throw new RangeError('Cannot deal: shoe is exhausted')
    }
    const card = this.cards[this.cursor]!
    this.cursor++
    return card
  }
}

export { CARDS_PER_DECK }

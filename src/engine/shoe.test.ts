import { describe, it, expect } from 'vitest'
import { Shoe } from './shoe'
import { createRng } from './rng'
import { cardValue } from './cards'
import type { Card } from './types'

const makeShoe = (decks = 6, penetration = 0.75, seed = 'shoe-seed') =>
  new Shoe({ decks, penetration, rng: createRng(seed) })

const sortKey = (c: Card) => `${c.rank}-${c.suit}`

describe('Shoe construction', () => {
  it('holds decks × 52 cards', () => {
    expect(makeShoe(6).size).toBe(312)
    expect(makeShoe(1).size).toBe(52)
  })

  it('rejects out-of-range penetration', () => {
    const rng = createRng('x')
    expect(() => new Shoe({ decks: 6, penetration: 0, rng })).toThrow(RangeError)
    expect(() => new Shoe({ decks: 6, penetration: 1.1, rng })).toThrow(
      RangeError,
    )
  })
})

describe('dealing', () => {
  it('advances counts as cards are dealt', () => {
    const shoe = makeShoe(1)
    expect(shoe.cardsDealt).toBe(0)
    expect(shoe.cardsRemaining).toBe(52)
    shoe.deal()
    expect(shoe.cardsDealt).toBe(1)
    expect(shoe.cardsRemaining).toBe(51)
  })

  it('throws when physically exhausted', () => {
    // penetration 1 so the cut card never triggers before exhaustion
    const shoe = makeShoe(1, 1)
    for (let i = 0; i < 52; i++) shoe.deal()
    expect(shoe.cardsRemaining).toBe(0)
    expect(() => shoe.deal()).toThrow(RangeError)
  })

  it('preserves the full card multiset after shuffling', () => {
    const shoe = makeShoe(1, 1)
    const dealt: Card[] = []
    for (let i = 0; i < 52; i++) dealt.push(shoe.deal())

    // Same 52 unique cards, just reordered.
    expect(new Set(dealt.map(sortKey)).size).toBe(52)
    // Rank composition intact: four aces, sixteen ten-values, etc.
    expect(dealt.filter((c) => c.rank === 'A')).toHaveLength(4)
    expect(dealt.filter((c) => cardValue(c.rank) === 10)).toHaveLength(16)
  })
})

describe('determinism', () => {
  it('same seed → identical deal order', () => {
    const a = makeShoe(2, 1, 'same')
    const b = makeShoe(2, 1, 'same')
    const seqA = Array.from({ length: 20 }, () => sortKey(a.deal()))
    const seqB = Array.from({ length: 20 }, () => sortKey(b.deal()))
    expect(seqA).toEqual(seqB)
  })

  it('different seeds → different deal order', () => {
    const a = makeShoe(2, 1, 'seed-a')
    const b = makeShoe(2, 1, 'seed-b')
    const seqA = Array.from({ length: 20 }, () => sortKey(a.deal()))
    const seqB = Array.from({ length: 20 }, () => sortKey(b.deal()))
    expect(seqA).not.toEqual(seqB)
  })
})

describe('penetration / reshuffle', () => {
  it('flags reshuffle at the cut card', () => {
    const shoe = makeShoe(1, 0.5) // cut card at 26 of 52
    expect(shoe.needsReshuffle).toBe(false)
    for (let i = 0; i < 25; i++) shoe.deal()
    expect(shoe.needsReshuffle).toBe(false)
    shoe.deal() // 26th
    expect(shoe.needsReshuffle).toBe(true)
  })

  it('reshuffle resets the cursor and refills the shoe', () => {
    const shoe = makeShoe(1, 0.5)
    for (let i = 0; i < 30; i++) shoe.deal()
    expect(shoe.needsReshuffle).toBe(true)
    shoe.reshuffle()
    expect(shoe.cardsDealt).toBe(0)
    expect(shoe.cardsRemaining).toBe(52)
    expect(shoe.needsReshuffle).toBe(false)
  })
})

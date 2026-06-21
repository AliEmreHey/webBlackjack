import { describe, it, expect } from 'vitest'
import { buildDeck, buildShoeCards, cardValue, isTenValue } from './cards'
import { RANKS } from './types'

describe('cardValue', () => {
  it('values pips as their number', () => {
    expect(cardValue('2')).toBe(2)
    expect(cardValue('9')).toBe(9)
  })

  it('values 10/J/Q/K as 10', () => {
    expect(cardValue('10')).toBe(10)
    expect(cardValue('J')).toBe(10)
    expect(cardValue('Q')).toBe(10)
    expect(cardValue('K')).toBe(10)
  })

  it('values ace as 11', () => {
    expect(cardValue('A')).toBe(11)
  })
})

describe('isTenValue', () => {
  it('is true only for ten-valued ranks', () => {
    expect(['10', 'J', 'Q', 'K'].every((r) => isTenValue(r as never))).toBe(true)
    expect(['2', '9', 'A'].some((r) => isTenValue(r as never))).toBe(false)
  })
})

describe('buildDeck', () => {
  it('has 52 unique cards', () => {
    const deck = buildDeck()
    expect(deck).toHaveLength(52)
    const keys = new Set(deck.map((c) => `${c.rank}-${c.suit}`))
    expect(keys.size).toBe(52)
  })

  it('has exactly 4 of each rank', () => {
    const deck = buildDeck()
    for (const rank of RANKS) {
      expect(deck.filter((c) => c.rank === rank)).toHaveLength(4)
    }
  })
})

describe('buildShoeCards', () => {
  it('builds decks × 52 cards', () => {
    expect(buildShoeCards(6)).toHaveLength(312)
    expect(buildShoeCards(1)).toHaveLength(52)
  })

  it('rejects invalid deck counts', () => {
    expect(() => buildShoeCards(0)).toThrow(RangeError)
    expect(() => buildShoeCards(-1)).toThrow(RangeError)
    expect(() => buildShoeCards(2.5)).toThrow(RangeError)
  })
})

import { describe, it, expect } from 'vitest'
import {
  cardCountValue,
  computeCountState,
  estimateDecksRemaining,
  runningCount,
  trueCount,
} from './count'
import { buildDeck } from './cards'
import { Shoe } from './shoe'
import { createRng } from './rng'
import { HI_LO } from '../data/countingSystems'
import type { Card, Rank } from './types'

const card = (rank: Rank): Card => ({ rank, suit: 'spades' })

describe('cardCountValue (Hi-Lo)', () => {
  it('assigns +1 to 2–6', () => {
    for (const r of ['2', '3', '4', '5', '6'] as Rank[]) {
      expect(cardCountValue(HI_LO, r)).toBe(1)
    }
  })
  it('assigns 0 to 7–9', () => {
    for (const r of ['7', '8', '9'] as Rank[]) {
      expect(cardCountValue(HI_LO, r)).toBe(0)
    }
  })
  it('assigns −1 to 10/J/Q/K/A', () => {
    for (const r of ['10', 'J', 'Q', 'K', 'A'] as Rank[]) {
      expect(cardCountValue(HI_LO, r)).toBe(-1)
    }
  })
})

describe('runningCount', () => {
  it('sums dealt card values', () => {
    // +1 +1 -1 0 = +1
    expect(runningCount(HI_LO, [card('3'), card('5'), card('K'), card('8')]))
      .toBe(1)
  })

  it('is 0 for an empty hand', () => {
    expect(runningCount(HI_LO, [])).toBe(0)
  })

  it('balanced system: a full 52-card deck sums to 0', () => {
    expect(runningCount(HI_LO, buildDeck())).toBe(0)
  })

  it('balanced system: an entire dealt shoe sums to 0', () => {
    const shoe = new Shoe({ decks: 6, penetration: 1, rng: createRng('count') })
    const dealt: Card[] = []
    while (shoe.cardsRemaining > 0) dealt.push(shoe.deal())
    expect(dealt).toHaveLength(312)
    expect(runningCount(HI_LO, dealt)).toBe(0)
  })
})

describe('estimateDecksRemaining', () => {
  it('exact mode returns the raw quotient', () => {
    expect(estimateDecksRemaining(312, 'exact')).toBe(6)
    expect(estimateDecksRemaining(78, 'exact')).toBe(1.5)
  })

  it('half mode rounds to the nearest half deck', () => {
    expect(estimateDecksRemaining(78, 'half')).toBe(1.5) // 1.5 exact
    expect(estimateDecksRemaining(70, 'half')).toBe(1.5) // 1.346 → 1.5
    expect(estimateDecksRemaining(60, 'half')).toBe(1) // 1.153 → 1.0
  })

  it('quarter mode rounds to the nearest quarter deck', () => {
    expect(estimateDecksRemaining(65, 'quarter')).toBe(1.25) // 1.25 exact
  })

  it('never returns 0 while cards remain (clamped)', () => {
    expect(estimateDecksRemaining(5, 'half')).toBe(0.5)
    expect(estimateDecksRemaining(5, 'quarter')).toBe(0.25)
    expect(estimateDecksRemaining(1, 'exact')).toBeGreaterThan(0)
  })

  it('returns exactly 0 when no cards remain', () => {
    expect(estimateDecksRemaining(0, 'exact')).toBe(0)
    expect(estimateDecksRemaining(0, 'half')).toBe(0)
  })
})

describe('trueCount', () => {
  it('divides running count by decks remaining', () => {
    expect(trueCount(6, 3)).toBe(2)
    expect(trueCount(5, 2)).toBe(2.5)
    expect(trueCount(-4, 2)).toBe(-2)
  })

  it('returns 0 when no decks remain (no divide-by-zero)', () => {
    expect(trueCount(10, 0)).toBe(0)
  })
})

describe('computeCountState', () => {
  it('combines running, decks remaining, and true count', () => {
    // 156 cards remaining = 3 decks exact; RC +6 → TC +2
    expect(computeCountState(6, 156, 'exact')).toEqual({
      running: 6,
      decksRemaining: 3,
      true: 2,
    })
  })

  it('respects the rounding mode for true count', () => {
    // 70 cards → half-deck estimate 1.5; RC +3 → TC +2
    const state = computeCountState(3, 70, 'half')
    expect(state.decksRemaining).toBe(1.5)
    expect(state.true).toBe(2)
  })
})

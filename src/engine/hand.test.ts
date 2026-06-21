import { describe, it, expect } from 'vitest'
import { evaluateHand, handTotal, isBlackjack, isBust, isPair } from './hand'
import type { Card, Rank } from './types'

// Tiny helper: build cards from ranks; suit is irrelevant to evaluation.
const h = (...ranks: Rank[]): Card[] =>
  ranks.map((rank) => ({ rank, suit: 'spades' }))

describe('evaluateHand', () => {
  it('sums hard hands with no aces', () => {
    expect(evaluateHand(h('10', '7'))).toEqual({ total: 17, soft: false })
    expect(evaluateHand(h('5', '6', '4'))).toEqual({ total: 15, soft: false })
  })

  it('counts a lone ace as 11 (soft)', () => {
    expect(evaluateHand(h('A', '6'))).toEqual({ total: 17, soft: true })
  })

  it('demotes ace to 1 when 11 would bust (hard)', () => {
    expect(evaluateHand(h('A', '6', '10'))).toEqual({ total: 17, soft: false })
  })

  it('handles multiple aces, keeping at most one as 11', () => {
    expect(evaluateHand(h('A', 'A'))).toEqual({ total: 12, soft: true })
    expect(evaluateHand(h('A', 'A', '9'))).toEqual({ total: 21, soft: true })
    expect(evaluateHand(h('A', 'A', '9', '8'))).toEqual({
      total: 19,
      soft: false,
    })
  })

  it('blackjack is 21 and soft', () => {
    expect(evaluateHand(h('A', 'K'))).toEqual({ total: 21, soft: true })
  })

  it('reports bust totals (all aces hard)', () => {
    expect(evaluateHand(h('10', '7', '8'))).toEqual({ total: 25, soft: false })
  })
})

describe('handTotal', () => {
  it('returns the best total', () => {
    expect(handTotal(h('A', '7'))).toBe(18)
    expect(handTotal(h('K', 'Q', '5'))).toBe(25)
  })
})

describe('isBlackjack', () => {
  it('is true for a two-card 21', () => {
    expect(isBlackjack(h('A', 'K'))).toBe(true)
    expect(isBlackjack(h('A', '10'))).toBe(true)
  })

  it('is false for a three-card 21', () => {
    expect(isBlackjack(h('7', '7', '7'))).toBe(false)
  })

  it('is false for a two-card non-21', () => {
    expect(isBlackjack(h('A', '9'))).toBe(false)
  })
})

describe('isBust', () => {
  it('detects busts', () => {
    expect(isBust(h('10', '10', '5'))).toBe(true)
    expect(isBust(h('10', '10'))).toBe(false)
    expect(isBust(h('A', '10', '10'))).toBe(false) // 21, ace demoted
  })
})

describe('isPair', () => {
  it('is true for equal ranks', () => {
    expect(isPair(h('8', '8'))).toBe(true)
    expect(isPair(h('A', 'A'))).toBe(true)
  })

  it('treats any two ten-values as a pair', () => {
    expect(isPair(h('K', '10'))).toBe(true)
    expect(isPair(h('J', 'Q'))).toBe(true)
  })

  it('is false for non-pairs and wrong card counts', () => {
    expect(isPair(h('8', '9'))).toBe(false)
    expect(isPair(h('8'))).toBe(false)
    expect(isPair(h('8', '8', '8'))).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  basicStrategy,
  dealerUpcardValue,
  findDeviation,
  recommendAction,
  shouldTakeInsurance,
  type PlayOptions,
} from './strategy'
import type { Card, Rank } from './types'

const h = (...ranks: Rank[]): Card[] =>
  ranks.map((rank) => ({ rank, suit: 'spades' }))

const ALL: PlayOptions = { canDouble: true, canSplit: true, canSurrender: true }
const NO_DOUBLE: PlayOptions = { ...ALL, canDouble: false }
const NO_SPLIT: PlayOptions = { ...ALL, canSplit: false }
const NO_SURRENDER: PlayOptions = { ...ALL, canSurrender: false }

describe('dealerUpcardValue', () => {
  it('maps ranks to 2–11 (Ace=11, tens=10)', () => {
    expect(dealerUpcardValue('2')).toBe(2)
    expect(dealerUpcardValue('9')).toBe(9)
    expect(dealerUpcardValue('10')).toBe(10)
    expect(dealerUpcardValue('K')).toBe(10)
    expect(dealerUpcardValue('A')).toBe(11)
  })
})

describe('basicStrategy — well-known hard decisions', () => {
  it('stands 16 vs 6; surrenders 16 vs 10 (LS) or hits it without surrender', () => {
    expect(basicStrategy(h('10', '6'), '6')).toBe('stand')
    expect(basicStrategy(h('10', '6'), '10')).toBe('surrender')
    expect(basicStrategy(h('10', '6'), '10', NO_SURRENDER)).toBe('hit')
  })
  it('hits 12 vs 2/3, stands 12 vs 4–6', () => {
    expect(basicStrategy(h('10', '2'), '2')).toBe('hit')
    expect(basicStrategy(h('10', '2'), '3')).toBe('hit')
    expect(basicStrategy(h('10', '2'), '4')).toBe('stand')
    expect(basicStrategy(h('10', '2'), '6')).toBe('stand')
  })
  it('doubles 11 vs 10 but hits 11 vs A (S17)', () => {
    expect(basicStrategy(h('6', '5'), '10')).toBe('double')
    expect(basicStrategy(h('6', '5'), 'A')).toBe('hit')
  })
  it('doubles 9 vs 3–6 only', () => {
    expect(basicStrategy(h('5', '4'), '2')).toBe('hit')
    expect(basicStrategy(h('5', '4'), '3')).toBe('double')
    expect(basicStrategy(h('5', '4'), '6')).toBe('double')
    expect(basicStrategy(h('5', '4'), '7')).toBe('hit')
  })
})

describe('basicStrategy — soft decisions', () => {
  it('A,7 stands vs 2, doubles vs 6, hits vs 9', () => {
    expect(basicStrategy(h('A', '7'), '2')).toBe('stand')
    expect(basicStrategy(h('A', '7'), '6')).toBe('double')
    expect(basicStrategy(h('A', '7'), '9')).toBe('hit')
  })
  it('A,8 (soft 19) always stands', () => {
    expect(basicStrategy(h('A', '8'), '6')).toBe('stand')
  })
})

describe('basicStrategy — pairs', () => {
  it('always splits 8,8 and A,A', () => {
    expect(basicStrategy(h('8', '8'), '10')).toBe('split')
    expect(basicStrategy(h('A', 'A'), 'A')).toBe('split')
  })
  it('never splits 5,5 (plays as 10 → double)', () => {
    expect(basicStrategy(h('5', '5'), '6')).toBe('double')
    expect(basicStrategy(h('5', '5'), '10')).toBe('hit')
  })
  it('9,9 splits vs 6 but stands vs 7 and 10', () => {
    expect(basicStrategy(h('9', '9'), '6')).toBe('split')
    expect(basicStrategy(h('9', '9'), '7')).toBe('stand')
    expect(basicStrategy(h('9', '9'), '10')).toBe('stand')
  })
})

describe('basicStrategy — option fallbacks', () => {
  it('double becomes hit when doubling is off', () => {
    expect(basicStrategy(h('6', '5'), '10', NO_DOUBLE)).toBe('hit')
  })
  it('Ds (A,7 vs 4) becomes stand when doubling is off', () => {
    expect(basicStrategy(h('A', '7'), '4', NO_DOUBLE)).toBe('stand')
  })
  it('surrender (16 vs 10) becomes hit when surrender is off', () => {
    expect(basicStrategy(h('10', '6'), '10', NO_SURRENDER)).toBe('hit')
  })
  it('pair falls back to total when splitting is off (8,8 vs 7 → hit 16)', () => {
    expect(basicStrategy(h('8', '8'), '7', NO_SPLIT)).toBe('hit')
  })
})

describe('findDeviation & recommendAction — Illustrious 18', () => {
  it('16 vs 10: stands at TC ≥ 0, surrenders below (basic LS)', () => {
    expect(recommendAction(h('10', '6'), '10', 0).action).toBe('stand')
    expect(recommendAction(h('10', '6'), '10', 1).action).toBe('stand')
    // Below the index → basic strategy, which surrenders 16 v 10 with LS.
    const low = recommendAction(h('10', '6'), '10', -1)
    expect(low.action).toBe('surrender')
    expect(low.deviation).toBeNull()
  })

  it('12 vs 4: hits at TC ≤ 0 (negative-index play), else stands', () => {
    expect(recommendAction(h('10', '2'), '4', 0).action).toBe('hit')
    expect(recommendAction(h('10', '2'), '4', -1).action).toBe('hit')
    expect(recommendAction(h('10', '2'), '4', 1).action).toBe('stand')
  })

  it('11 vs A: doubles at TC ≥ +1, hits below (matches S17 basic baseline)', () => {
    const dev = recommendAction(h('6', '5'), 'A', 1)
    expect(dev.action).toBe('double')
    expect(dev.basicAction).toBe('hit') // baseline recomputed from chart
    expect(dev.deviation?.id).toBe('i18-11vA')
    expect(recommendAction(h('6', '5'), 'A', 0).action).toBe('hit')
  })

  it('10,10 vs 5: splits at TC ≥ +5, else stands', () => {
    expect(recommendAction(h('10', '10'), '5', 5).action).toBe('split')
    expect(recommendAction(h('10', '10'), '5', 4).action).toBe('stand')
  })

  it('does not apply the hard-16 stand deviation to a splittable 8,8', () => {
    // 8,8 vs 10 must remain a split, not become a "16 vs 10 stand".
    expect(recommendAction(h('8', '8'), '10', 5).action).toBe('split')
  })
})

describe('recommendAction — Fab 4 surrender', () => {
  it('15 vs 9: surrenders at TC ≥ +2 when available', () => {
    expect(recommendAction(h('10', '5'), '9', 2).action).toBe('surrender')
    expect(recommendAction(h('10', '5'), '9', 1).action).toBe('hit')
  })

  it('14 vs 10: surrenders at TC ≥ +3', () => {
    expect(recommendAction(h('10', '4'), '10', 3).action).toBe('surrender')
    expect(recommendAction(h('10', '4'), '10', 2).action).toBe('hit')
  })

  it('surrender deviation is skipped when surrender is unavailable', () => {
    const r = recommendAction(h('10', '5'), '9', 2, NO_SURRENDER)
    expect(r.action).not.toBe('surrender')
    expect(r.action).toBe('hit') // falls back to basic
  })

  it('double deviation falls back to basic when doubling is unavailable', () => {
    // 9 vs 7 doubles at +3; with no double it should hit (its baseline).
    expect(recommendAction(h('5', '4'), '7', 3, NO_DOUBLE).action).toBe('hit')
  })
})

describe('shouldTakeInsurance', () => {
  it('takes insurance only at TC ≥ +3', () => {
    expect(shouldTakeInsurance(3)).toBe(true)
    expect(shouldTakeInsurance(4)).toBe(true)
    expect(shouldTakeInsurance(2)).toBe(false)
  })
})

describe('findDeviation direct', () => {
  it('returns null when no deviation matches', () => {
    const ctx = {
      total: 19,
      soft: false,
      isPair: false,
      dealerUpcard: 5 as const,
    }
    expect(findDeviation(ctx, 5)).toBeNull()
  })
})

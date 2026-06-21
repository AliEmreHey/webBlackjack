import { describe, it, expect } from 'vitest'
import { decideAction } from './playingStyle'
import { cellKey, EMPTY_CUSTOM, type CustomStrategy } from './strategyOverrides'
import type { Card, Rank } from './types'
import type { PlayOptions } from './strategy'

const h = (...ranks: Rank[]): Card[] =>
  ranks.map((rank) => ({ rank, suit: 'spades' }))

const ALL: PlayOptions = { canDouble: true, canSplit: true, canSurrender: true }

describe('decideAction — optimal', () => {
  it('applies count deviations (16 vs 10 stands at TC ≥ 0)', () => {
    expect(decideAction('optimal', h('10', '6'), '10', 0, ALL)).toBe('stand')
    // below the index it reverts (basic LS surrenders 16 v 10)
    expect(decideAction('optimal', h('10', '6'), '10', -1, ALL)).toBe('surrender')
  })
})

describe('decideAction — basic', () => {
  it('ignores the count (no deviation)', () => {
    // 16 v 10 basic = surrender regardless of a high count
    expect(decideAction('basic', h('10', '6'), '10', 5, ALL)).toBe('surrender')
    // 12 v 4 basic = stand regardless of a low count
    expect(decideAction('basic', h('10', '2'), '4', -5, ALL)).toBe('stand')
  })
})

describe('decideAction — aggressive', () => {
  it('hits every stiff, even 16 vs a weak 6', () => {
    expect(decideAction('aggressive', h('10', '6'), '6', 0, ALL)).toBe('hit')
    expect(decideAction('aggressive', h('10', '2'), '4', 0, ALL)).toBe('hit') // 12
  })
  it('stands on 17+', () => {
    expect(decideAction('aggressive', h('10', '7'), '6', 0, ALL)).toBe('stand')
  })
  it('still splits aces and eights', () => {
    expect(decideAction('aggressive', h('8', '8'), '10', 0, ALL)).toBe('split')
  })
})

describe('decideAction — defensive', () => {
  it('stands on every stiff, even 12 vs a strong 10', () => {
    expect(decideAction('defensive', h('10', '2'), '10', 0, ALL)).toBe('stand')
    expect(decideAction('defensive', h('10', '6'), '10', 0, ALL)).toBe('stand')
  })
  it('hits hard totals of 11 or less', () => {
    expect(decideAction('defensive', h('5', '4'), '10', 0, ALL)).toBe('hit') // 9
  })
  it('never doubles', () => {
    expect(decideAction('defensive', h('5', '6'), '6', 0, ALL)).not.toBe('double')
  })
})

describe('decideAction — custom (count regimes)', () => {
  const custom = (over: Partial<CustomStrategy>): CustomStrategy => ({
    ...EMPTY_CUSTOM,
    ...over,
  })

  it('with an empty custom strategy plays exactly like optimal', () => {
    const opt = decideAction('optimal', h('10', '6'), '10', 0, ALL)
    const cust = decideAction('custom', h('10', '6'), '10', 0, ALL, EMPTY_CUSTOM)
    expect(cust).toBe(opt)
    expect(cust).toBe('stand') // 16 v 10 stands at TC ≥ 0
  })

  it('a base cell forces that decision at every count', () => {
    const c = custom({ base: { [cellKey('hard', 16, 10)]: 'S' } })
    expect(decideAction('custom', h('10', '6'), '10', -5, ALL, c)).toBe('stand')
    // Without it, optimal surrenders 16 v 10 below the index.
    expect(decideAction('custom', h('10', '6'), '10', -5, ALL, EMPTY_CUSTOM)).toBe(
      'surrender',
    )
  })

  it('resolves a set cell against what is allowed (D → hit when no double)', () => {
    const c = custom({ base: { [cellKey('hard', 16, 10)]: 'D' } })
    const noDouble: PlayOptions = { ...ALL, canDouble: false }
    expect(decideAction('custom', h('10', '6'), '10', 0, noDouble, c)).toBe('hit')
  })

  it('uses the High chart once the true count reaches the threshold', () => {
    // 12 vs 4: base hit, but stand when count ≥ +2.
    const key = cellKey('hard', 12, 4)
    const c = custom({
      highThreshold: 2,
      base: { [key]: 'H' },
      high: { [key]: 'S' },
    })
    const hand = h('10', '2')
    expect(decideAction('custom', hand, '4', 1, ALL, c)).toBe('hit')
    expect(decideAction('custom', hand, '4', 2, ALL, c)).toBe('stand')
    expect(decideAction('custom', hand, '4', 5, ALL, c)).toBe('stand')
  })

  it('uses Low/High charts by threshold, High winning over Low', () => {
    const key = cellKey('hard', 13, 6)
    const c = custom({
      highThreshold: 4,
      lowThreshold: -1,
      base: { [key]: 'S' },
      high: { [key]: 'D' },
      low: { [key]: 'H' },
    })
    const hand = h('10', '3') // hard 13
    expect(decideAction('custom', hand, '6', -2, ALL, c)).toBe('hit') // ≤ −1
    expect(decideAction('custom', hand, '6', 0, ALL, c)).toBe('stand') // base
    expect(decideAction('custom', hand, '6', 4, ALL, c)).toBe('double') // ≥ +4
  })

  it('a cell set only in High falls back to optimal at neutral counts', () => {
    const key = cellKey('hard', 16, 10)
    const c = custom({ highThreshold: 3, high: { [key]: 'H' } })
    // At a neutral count, no base/low cell → optimal (stand at TC ≥ 0).
    expect(decideAction('custom', h('10', '6'), '10', 0, ALL, c)).toBe('stand')
    // At a high count, the High chart applies.
    expect(decideAction('custom', h('10', '6'), '10', 3, ALL, c)).toBe('hit')
  })
})

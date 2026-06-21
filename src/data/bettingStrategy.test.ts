import { describe, it, expect } from 'vitest'
import {
  betForTrueCount,
  minBet,
  FLAT,
  GENTLE_RAMP,
  CONSERVATIVE_1_8,
} from './bettingStrategy'

describe('betForTrueCount', () => {
  it('flat strategy bets the same at every count', () => {
    for (const tc of [-5, 0, 3, 10]) {
      expect(betForTrueCount(FLAT, tc)).toBe(10)
    }
  })

  it('matches the gentle ramp tier-for-tier', () => {
    expect(betForTrueCount(GENTLE_RAMP, -2)).toBe(5)
    expect(betForTrueCount(GENTLE_RAMP, -1)).toBe(10)
    expect(betForTrueCount(GENTLE_RAMP, 0)).toBe(10)
    expect(betForTrueCount(GENTLE_RAMP, 1)).toBe(10)
    expect(betForTrueCount(GENTLE_RAMP, 2)).toBe(12)
    expect(betForTrueCount(GENTLE_RAMP, 3)).toBe(20)
    expect(betForTrueCount(GENTLE_RAMP, 5)).toBe(40)
  })

  it('floors the true count before lookup', () => {
    expect(betForTrueCount(GENTLE_RAMP, 2.9)).toBe(12) // floor 2
    expect(betForTrueCount(GENTLE_RAMP, 3.0)).toBe(20)
  })

  it('clamps the tails: below first level and above last', () => {
    expect(betForTrueCount(GENTLE_RAMP, -10)).toBe(5) // below first
    expect(betForTrueCount(GENTLE_RAMP, 99)).toBe(40) // above last
  })
})

describe('minBet', () => {
  it('returns the smallest level bet', () => {
    expect(minBet(FLAT)).toBe(10)
    expect(minBet(GENTLE_RAMP)).toBe(5)
    expect(minBet(CONSERVATIVE_1_8)).toBe(10)
  })
})

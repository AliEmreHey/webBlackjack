import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  it('is deterministic: same seed → same sequence', () => {
    const a = createRng('seed-1')
    const b = createRng('seed-1')
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng('seed-1')
    const b = createRng('seed-2')
    expect(a.next()).not.toBe(b.next())
  })

  it('accepts numeric seeds', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect(a.next()).toBe(b.next())
  })

  it('next() stays in [0, 1)', () => {
    const rng = createRng('range')
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int(n) stays in [0, n)', () => {
    const rng = createRng('ints')
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(6)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('int() rejects non-positive bounds', () => {
    const rng = createRng('bad')
    expect(() => rng.int(0)).toThrow(RangeError)
    expect(() => rng.int(-3)).toThrow(RangeError)
  })
})

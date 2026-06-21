import { describe, it, expect } from 'vitest'
import { runSimulation, type SimConfig } from './simulator'
import { FLAT, AGGRESSIVE_1_16, CONSERVATIVE_1_8 } from '../data/bettingStrategy'

const base: SimConfig = {
  strategy: FLAT,
  startingBankroll: 100000, // large so flat betting never ruins
  handsPerRun: 300,
  trials: 20,
  seed: 'sim-test',
}

describe('runSimulation — structure & invariants', () => {
  it('plays hands and reports coherent aggregates', () => {
    const r = runSimulation(base)
    expect(r.trials).toBe(20)
    expect(r.totalHands).toBeGreaterThan(0)
    expect(r.totalHands).toBeLessThanOrEqual(20 * 300)
    // Per-hour figures derive from per-hand figures.
    expect(r.evPerHour).toBeCloseTo(r.evPerHand * 100, 6)
    expect(r.sdPerHour).toBeCloseTo(r.sdPerHand * 10, 6) // sqrt(100)
    expect(r.expectedTotal).toBeCloseTo(r.evPerHand * 300, 6)
    expect(r.sdPerHand).toBeGreaterThan(0)
  })

  it('captures a bankroll trajectory for one run', () => {
    const r = runSimulation(base)
    expect(r.trajectory[0]).toBe(base.startingBankroll)
    expect(r.trajectory.length).toBeGreaterThan(1)
  })

  it('is deterministic for a fixed seed', () => {
    const a = runSimulation(base)
    const b = runSimulation(base)
    expect(b.evPerHand).toBe(a.evPerHand)
    expect(b.riskOfRuin).toBe(a.riskOfRuin)
    expect(b.trajectory).toEqual(a.trajectory)
  })

  it('keeps a flat bet within a sane per-hand magnitude', () => {
    // Not asserting sign (variance), just that it is near a €10 bet's scale.
    const r = runSimulation(base)
    expect(Math.abs(r.evPerHand)).toBeLessThan(2)
  })
})

describe('runSimulation — playing styles', () => {
  // Same ramp + a huge bankroll (no ruin noise) so EV reflects the style alone.
  const evFor = (playingStyle: SimConfig['playingStyle']) =>
    runSimulation({
      strategy: CONSERVATIVE_1_8,
      playingStyle,
      startingBankroll: 1_000_000,
      handsPerRun: 4000,
      trials: 40,
      seed: 'style-test',
    }).evPerHour

  it('the deliberately-bad styles earn clearly less than optimal', () => {
    const optimal = evFor('optimal')
    // Wide margins so these never flake on variance.
    expect(optimal).toBeGreaterThan(evFor('defensive') + 5)
    expect(optimal).toBeGreaterThan(evFor('aggressive') + 5)
  })

  it('the style actually changes the result (it is wired through)', () => {
    expect(evFor('optimal')).not.toBe(evFor('defensive'))
  })
})

describe('runSimulation — shuffle every hand (CSM)', () => {
  // A counting spread that wins with normal penetration should lose its edge
  // when the deck is reshuffled every hand (the count never builds).
  const evFor = (shuffleEachRound: boolean) =>
    runSimulation({
      strategy: CONSERVATIVE_1_8,
      startingBankroll: 1_000_000,
      handsPerRun: 5000,
      trials: 40,
      shuffleEachRound,
      seed: 'csm-test',
    }).evPerHour

  it('counting earns less against a CSM than against a cut-card shoe', () => {
    expect(evFor(true)).toBeLessThan(evFor(false) - 3)
  })
})

describe('runSimulation — risk of ruin', () => {
  it('is 0 with a huge bankroll and tiny flat bet', () => {
    const r = runSimulation({ ...base, startingBankroll: 1_000_000 })
    expect(r.riskOfRuin).toBe(0)
  })

  it('is positive when the bankroll is tiny vs the bets', () => {
    const r = runSimulation({
      strategy: AGGRESSIVE_1_16,
      startingBankroll: 40, // only a few minimum bets
      handsPerRun: 500,
      trials: 50,
      seed: 'ruin-test',
    })
    expect(r.riskOfRuin).toBeGreaterThan(0)
    expect(r.riskOfRuin).toBeLessThanOrEqual(1)
  })
})

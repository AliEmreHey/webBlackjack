/**
 * Strategy simulator: plays a betting strategy over many hands using the real
 * Game engine, then reports the expected euro result, the swing band (one
 * standard deviation), and the risk of ruin (via Monte Carlo).
 *
 * Pure and deterministic given a seed. Playing decisions use the engine's
 * recommended play (basic strategy + Illustrious 18 / Fab 4); the *betting*
 * strategy is the variable under study — which is where counting's value lives.
 */

import {
  type BettingStrategy,
  betForTrueCount,
  minBet,
} from '../data/bettingStrategy'
import {
  type CountingSystem,
  DEFAULT_COUNTING_SYSTEM,
} from '../data/countingSystems'
import { Game } from './game'
import { decideAction, type PlayingStyle } from './playingStyle'
import type { CustomStrategy } from './strategyOverrides'
import { DEFAULT_RULES, type TableRules } from './rules'
import type { Action } from './types'

export interface SimConfig {
  strategy: BettingStrategy
  rules?: TableRules
  countingSystem?: CountingSystem
  startingBankroll: number
  /** Hands to play per run (a run ends early on ruin). */
  handsPerRun: number
  /** Independent runs for the risk-of-ruin estimate. */
  trials: number
  /** Hands played per hour, for the per-hour figures. Default 100. */
  handsPerHour?: number
  /** How the player decides each hand (default 'optimal'). */
  playingStyle?: PlayingStyle
  /** Custom strategy used when playingStyle is 'custom'. */
  custom?: CustomStrategy
  /**
   * Reshuffle before every hand (a continuous shuffling machine). This resets
   * the count each hand, so counting can't build an edge — useful for showing
   * exactly how much the count is worth. Default false.
   */
  shuffleEachRound?: boolean
  seed?: string | number
}

export interface SimSummary {
  trials: number
  handsPerRun: number
  handsPerHour: number
  startingBankroll: number
  /** Total hands played across all runs (runs that ruined stopped early). */
  totalHands: number
  evPerHand: number
  evPerHour: number
  sdPerHand: number
  sdPerHour: number
  /** Expected euro result over a full (non-ruined) run. */
  expectedTotal: number
  /** Fraction of runs that lost the whole bankroll (0–1). */
  riskOfRuin: number
  /** Bankroll after each hand for one representative run (for charting). */
  trajectory: number[]
}

interface RunResult {
  sumDelta: number
  sumSq: number
  handsPlayed: number
  ruined: boolean
  trajectory: number[]
}

/** Pick the action to take for the active hand. */
function chooseAction(
  game: Game,
  style: PlayingStyle,
  custom?: CustomStrategy,
): Action {
  const round = game.round!
  const hand = round.hands[round.activeHandIndex]!
  const actions = game.availableActions()
  const options = {
    canDouble: actions.includes('double'),
    canSplit: actions.includes('split'),
    canSurrender: actions.includes('surrender'),
  }
  const dealerRank = round.dealer.cards[0]!.rank
  // Live true count at the moment of the decision.
  const trueCount = game.count.true
  const action = decideAction(
    style,
    hand.cards,
    dealerRank,
    trueCount,
    options,
    custom,
  )
  return actions.includes(action) ? action : 'stand'
}

function simulateRun(
  config: SimConfig,
  seed: string | number,
  capture: boolean,
): RunResult {
  const rules = config.rules ?? DEFAULT_RULES
  const style = config.playingStyle ?? 'optimal'
  const shuffleEachRound = config.shuffleEachRound ?? false
  const floor = minBet(config.strategy)
  const game = new Game({
    rules,
    countingSystem: config.countingSystem ?? DEFAULT_COUNTING_SYSTEM,
    startingBankroll: config.startingBankroll,
    seed,
  })

  let sumDelta = 0
  let sumSq = 0
  let handsPlayed = 0
  let ruined = false
  const trajectory: number[] = capture ? [config.startingBankroll] : []

  for (let h = 0; h < config.handsPerRun; h++) {
    if (game.bankroll < floor) {
      ruined = true
      break
    }
    // CSM: a fresh shoe (and reset count) every hand. Otherwise reshuffle only
    // at the cut card, carrying the count across hands.
    if (shuffleEachRound) game.reshuffle()
    else if (game.needsReshuffle) game.reshuffle()

    const trueCount = game.count.true
    const bet = Math.min(betForTrueCount(config.strategy, trueCount), game.bankroll)

    const before = game.bankroll
    game.startRound(bet)
    const round = game.round!
    if (round.insuranceOffered) {
      // Take insurance only when the count justifies it (TC ≥ +3) AND it's
      // affordable; otherwise a player simply declines.
      const wantInsurance =
        trueCount >= 3 && game.bankroll >= round.hands[0]!.bet / 2
      game.takeInsurance(wantInsurance)
    }
    while (game.round!.phase === 'player') {
      game.perform(chooseAction(game, style, config.custom))
    }
    // Dealer resolves automatically (manualDealer defaults to false).

    const delta = game.bankroll - before
    sumDelta += delta
    sumSq += delta * delta
    handsPlayed++
    if (capture) trajectory.push(game.bankroll)
  }

  return { sumDelta, sumSq, handsPlayed, ruined, trajectory }
}

/** Run the full Monte Carlo simulation and aggregate the results. */
export function runSimulation(config: SimConfig): SimSummary {
  const handsPerHour = config.handsPerHour ?? 100
  const baseSeed = config.seed ?? 'sim'

  let sumDelta = 0
  let sumSq = 0
  let totalHands = 0
  let ruinedCount = 0
  let trajectory: number[] = []

  for (let t = 0; t < config.trials; t++) {
    const run = simulateRun(config, `${baseSeed}-${t}`, t === 0)
    sumDelta += run.sumDelta
    sumSq += run.sumSq
    totalHands += run.handsPlayed
    if (run.ruined) ruinedCount++
    if (t === 0) trajectory = run.trajectory
  }

  const evPerHand = totalHands > 0 ? sumDelta / totalHands : 0
  const variance =
    totalHands > 0 ? Math.max(0, sumSq / totalHands - evPerHand * evPerHand) : 0
  const sdPerHand = Math.sqrt(variance)

  return {
    trials: config.trials,
    handsPerRun: config.handsPerRun,
    handsPerHour,
    startingBankroll: config.startingBankroll,
    totalHands,
    evPerHand,
    evPerHour: evPerHand * handsPerHour,
    sdPerHand,
    sdPerHour: sdPerHand * Math.sqrt(handsPerHour),
    expectedTotal: evPerHand * config.handsPerRun,
    riskOfRuin: config.trials > 0 ? ruinedCount / config.trials : 0,
    trajectory,
  }
}

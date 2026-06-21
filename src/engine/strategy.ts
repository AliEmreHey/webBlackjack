/**
 * Strategy lookup: basic strategy + count-based deviations, combined.
 *
 * The three data tables (basic, Illustrious 18, Fab 4) stay separate; this
 * module is the only place they're combined. The combined recommendation is:
 *
 *   recommended = matchingDeviation(forTrueCount) ?? basicStrategy
 *
 * Baseline nuance (RESEARCH.md §4): the engine ALWAYS recomputes the real basic
 * action from the chart and returns it as `basicAction`. A deviation's stored
 * `basicAction` is reference-only and never used to drive the recommendation,
 * so a deviation whose baseline already equals the chart is simply confirmatory
 * — nothing is silently overridden.
 *
 * Surrender interaction: basic strategy already encodes the count-neutral
 * late-surrender plays (15 vs 10, 16 vs 9/10/A). Deviations refine these by
 * exact true-count index (e.g. 16 vs 10 → stand at TC ≥ 0, surrender below).
 */

import { cardValue } from './cards'
import { evaluateHand, isPair as isPairHand } from './hand'
import type { Action, Card, Rank } from './types'
import {
  type DealerUpcardValue,
  type StrategyCode,
  dealerColumn,
  HARD_STRATEGY,
  PAIR_STRATEGY,
  SOFT_STRATEGY,
} from '../data/basicStrategy'
import {
  ALL_DEVIATIONS,
  type Deviation,
  INSURANCE_INDEX,
} from '../data/deviations'

/** What the player is permitted to do for the current decision. */
export interface PlayOptions {
  /** Doubling permitted (typically first two cards, subject to rules). */
  readonly canDouble: boolean
  /** Splitting permitted (a 2-card pair, under the split limit). */
  readonly canSplit: boolean
  /** Late surrender permitted (first two cards, dealer has no blackjack). */
  readonly canSurrender: boolean
}

const DEFAULT_OPTIONS: PlayOptions = {
  canDouble: true,
  canSplit: true,
  canSurrender: true,
}

/** Dealer upcard value 2–11 (Ace = 11) for table column lookup. */
export function dealerUpcardValue(rank: Rank): DealerUpcardValue {
  return cardValue(rank) as DealerUpcardValue
}

/** Resolve a table code to a concrete action given what's permitted. */
export function resolveCode(code: StrategyCode, options: PlayOptions): Action {
  switch (code) {
    case 'H':
      return 'hit'
    case 'S':
      return 'stand'
    case 'D':
      return options.canDouble ? 'double' : 'hit'
    case 'Ds':
      return options.canDouble ? 'double' : 'stand'
    case 'Rh':
      return options.canSurrender ? 'surrender' : 'hit'
    case 'P':
      return 'split'
  }
}

function lookupRow(
  row: readonly StrategyCode[] | undefined,
  upcard: DealerUpcardValue,
): StrategyCode | undefined {
  return row?.[dealerColumn(upcard)]
}

/**
 * Pure basic-strategy decision for the hand, ignoring the count.
 */
export function basicStrategy(
  playerCards: readonly Card[],
  dealerRank: Rank,
  options: PlayOptions = DEFAULT_OPTIONS,
): Action {
  const upcard = dealerUpcardValue(dealerRank)
  const { total, soft } = evaluateHand(playerCards)

  // Pairs (only when a split is actually available).
  if (options.canSplit && isPairHand(playerCards)) {
    const pairValue = cardValue(playerCards[0]!.rank)
    const code = lookupRow(PAIR_STRATEGY[pairValue], upcard)
    if (code) return resolveCode(code, options)
  }

  // Soft totals.
  if (soft) {
    if (total >= 20) return 'stand'
    const code = lookupRow(SOFT_STRATEGY[total], upcard)
    if (code) return resolveCode(code, options)
    return 'hit' // soft totals below the table (e.g. soft 12)
  }

  // Hard totals.
  if (total >= 17) return 'stand'
  if (total <= 7) return 'hit'
  const code = lookupRow(HARD_STRATEGY[total], upcard)
  if (code) return resolveCode(code, options)
  return 'hit'
}

export interface DeviationContext {
  readonly total: number
  readonly soft: boolean
  /** True only for a 2-card pair that can actually be split. */
  readonly isPair: boolean
  readonly pairValue?: number
  readonly dealerUpcard: DealerUpcardValue
}

function conditionMet(dev: Deviation, trueCount: number): boolean {
  return dev.direction === 'gte'
    ? trueCount >= dev.index
    : trueCount <= dev.index
}

function handMatches(dev: Deviation, ctx: DeviationContext): boolean {
  if (dev.dealerUpcard !== ctx.dealerUpcard) return false
  switch (dev.handType) {
    case 'pair':
      return ctx.isPair && ctx.pairValue === dev.pairValue
    case 'hard':
      return !ctx.isPair && !ctx.soft && ctx.total === dev.total
    case 'soft':
      return !ctx.isPair && ctx.soft && ctx.total === dev.total
  }
}

/**
 * Find the deviation that applies to this hand at this true count, or null.
 *
 * Fab 4 (surrender) entries are checked first so surrender wins ties when it's
 * available. Deviations whose action isn't currently permitted are skipped, so
 * they fall back to basic strategy (which is their intended baseline).
 */
export function findDeviation(
  ctx: DeviationContext,
  trueCount: number,
  options: PlayOptions = DEFAULT_OPTIONS,
): Deviation | null {
  for (const dev of ALL_DEVIATIONS) {
    if (!handMatches(dev, ctx)) continue
    if (!conditionMet(dev, trueCount)) continue
    if (dev.action === 'surrender' && !options.canSurrender) continue
    if (dev.action === 'double' && !options.canDouble) continue
    if (dev.action === 'split' && !options.canSplit) continue
    return dev
  }
  return null
}

export interface Recommendation {
  /** The action to take (deviation if one applies, else basic strategy). */
  readonly action: Action
  /** The pure basic-strategy action, always recomputed from the chart. */
  readonly basicAction: Action
  /** The deviation that fired, or null if playing basic strategy. */
  readonly deviation: Deviation | null
}

/**
 * The full recommendation for a hand at a given true count: basic strategy
 * with any applicable count deviation layered on top.
 */
export function recommendAction(
  playerCards: readonly Card[],
  dealerRank: Rank,
  trueCount: number,
  options: PlayOptions = DEFAULT_OPTIONS,
): Recommendation {
  const upcard = dealerUpcardValue(dealerRank)
  const { total, soft } = evaluateHand(playerCards)
  const pair = options.canSplit && isPairHand(playerCards)
  const pairValue = pair ? cardValue(playerCards[0]!.rank) : undefined

  const ctx: DeviationContext = {
    total,
    soft,
    isPair: pair,
    pairValue,
    dealerUpcard: upcard,
  }

  const basicAction = basicStrategy(playerCards, dealerRank, options)
  const deviation = findDeviation(ctx, trueCount, options)

  return {
    action: deviation ? deviation.action : basicAction,
    basicAction,
    deviation,
  }
}

/** Insurance is a +EV bet once the Hi-Lo true count reaches +3. */
export function shouldTakeInsurance(trueCount: number): boolean {
  return trueCount >= INSURANCE_INDEX
}

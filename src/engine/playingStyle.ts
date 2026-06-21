/**
 * Playing styles for the simulator — how the player decides hit/stand/double/
 * split/surrender. Lets users compare playing approaches, not just bet ramps.
 *
 * `optimal` and `basic` delegate to the verified strategy engine. `aggressive`
 * and `defensive` are deliberately sub-optimal archetypes so the simulator can
 * show what a playing style *costs* — the point is discovery, not prescription.
 */

import { evaluateHand, isPair } from './hand'
import { cardValue } from './cards'
import {
  basicStrategy,
  recommendAction,
  resolveCode,
  type PlayOptions,
} from './strategy'
import {
  customCodeFor,
  handCellKey,
  type CustomStrategy,
} from './strategyOverrides'
import type { Action, Card, Rank } from './types'

export type PlayingStyle =
  | 'optimal'
  | 'basic'
  | 'aggressive'
  | 'defensive'
  | 'custom'

export const PLAYING_STYLES: ReadonlyArray<{
  id: PlayingStyle
  label: string
  blurb: string
}> = [
  {
    id: 'optimal',
    label: 'Optimal',
    blurb: 'Basic strategy + count deviations (Illustrious 18 / Fab 4).',
  },
  {
    id: 'basic',
    label: 'Basic only',
    blurb: 'Perfect basic strategy, but no count-based deviations.',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    blurb: 'Hits every stiff (12–16) — never stands low. Bust-prone.',
  },
  {
    id: 'defensive',
    label: 'Defensive',
    blurb: 'Stands on every stiff (12+) — never risks busting.',
  },
  {
    id: 'custom',
    label: 'My Strategy',
    blurb: 'Optimal everywhere, except the plays you changed on the Strategy tab.',
  },
]

/** Split aces and eights — the two universally-correct splits the archetypes keep. */
function shouldSplitAcesOrEights(cards: readonly Card[]): boolean {
  const v = cardValue(cards[0]!.rank)
  return v === 11 || v === 8
}

/** Aggressive: hit all stiffs, double 10/11, split A/8 — otherwise stand high. */
function aggressive(cards: readonly Card[], options: PlayOptions): Action {
  if (options.canSplit && isPair(cards) && shouldSplitAcesOrEights(cards)) {
    return 'split'
  }
  const { total, soft } = evaluateHand(cards)
  if (options.canDouble && cards.length === 2 && (total === 10 || total === 11)) {
    return 'double'
  }
  if (soft) return total >= 18 ? 'stand' : 'hit'
  return total >= 17 ? 'stand' : 'hit'
}

/** Defensive: stand on every hard stiff (12+), never double/surrender. */
function defensive(cards: readonly Card[], options: PlayOptions): Action {
  if (options.canSplit && isPair(cards) && shouldSplitAcesOrEights(cards)) {
    return 'split'
  }
  const { total, soft } = evaluateHand(cards)
  if (soft) return total >= 18 ? 'stand' : 'hit'
  return total >= 12 ? 'stand' : 'hit'
}

/**
 * Decide an action for the given style. `trueCount` is only used by `optimal`
 * (for deviations); the other styles ignore the count.
 */
export function decideAction(
  style: PlayingStyle,
  cards: readonly Card[],
  dealerRank: Rank,
  trueCount: number,
  options: PlayOptions,
  custom?: CustomStrategy,
): Action {
  switch (style) {
    case 'optimal':
      return recommendAction(cards, dealerRank, trueCount, options).action
    case 'basic':
      return basicStrategy(cards, dealerRank, options)
    case 'aggressive':
      return aggressive(cards, options)
    case 'defensive':
      return defensive(cards, options)
    case 'custom': {
      const key = handCellKey(cards, dealerRank, options.canSplit)
      const code = key && custom ? customCodeFor(custom, key, trueCount) : undefined
      // A set cell governs that decision for the current count regime;
      // everything else stays optimal.
      if (code) return resolveCode(code, options)
      return recommendAction(cards, dealerRank, trueCount, options).action
    }
  }
}

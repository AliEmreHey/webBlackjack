/**
 * Count-based deviations as DATA — the Illustrious 18 and Fab 4, transcribed
 * from RESEARCH.md §4–§5 (Hi-Lo, multi-deck, S17).
 *
 * Kept SEPARATE from the basic-strategy tables (src/data/basicStrategy.ts).
 * They are combined only at the lookup layer (src/engine/strategy.ts), which
 * keeps the "baseline nuance" (RESEARCH.md §4) explicit: a deviation states its
 * own baseline `basicAction` for reference, but the engine always recomputes
 * the real basic action from the chart, so nothing is silently overridden.
 *
 * `direction`:
 *   gte → deviate when trueCount >= index
 *   lte → deviate when trueCount <= index
 */

import type { Action } from '../engine/types'
import type { DealerUpcardValue } from './basicStrategy'

export type DeviationHandType = 'hard' | 'soft' | 'pair'
export type DeviationGroup = 'I18' | 'Fab4'

export interface Deviation {
  readonly id: string
  readonly group: DeviationGroup
  readonly handType: DeviationHandType
  /** Player total for hard/soft hands. */
  readonly total?: number
  /** Card value of the pair (2…10, 11 for aces) for pair hands. */
  readonly pairValue?: number
  readonly dealerUpcard: DealerUpcardValue
  readonly index: number
  readonly direction: 'gte' | 'lte'
  readonly action: Action
  /** Reference baseline only; the engine recomputes the real basic action. */
  readonly basicAction: Action
  readonly label: string
}

/**
 * Insurance is not a hand action, so it lives outside the play-deviation table.
 * Take insurance (or "even money") when the Hi-Lo true count ≥ +3.
 */
export const INSURANCE_INDEX = 3

/** Illustrious 18 — the 17 play deviations (insurance is the 18th, above). */
export const ILLUSTRIOUS_18: readonly Deviation[] = [
  // Positive-index plays: deviate when TC >= index.
  { id: 'i18-16v10', group: 'I18', handType: 'hard', total: 16, dealerUpcard: 10, index: 0, direction: 'gte', action: 'stand', basicAction: 'hit', label: '16 vs 10 → Stand' },
  { id: 'i18-15v10', group: 'I18', handType: 'hard', total: 15, dealerUpcard: 10, index: 4, direction: 'gte', action: 'stand', basicAction: 'hit', label: '15 vs 10 → Stand' },
  { id: 'i18-TTv5', group: 'I18', handType: 'pair', pairValue: 10, dealerUpcard: 5, index: 5, direction: 'gte', action: 'split', basicAction: 'stand', label: '10,10 vs 5 → Split' },
  { id: 'i18-TTv6', group: 'I18', handType: 'pair', pairValue: 10, dealerUpcard: 6, index: 4, direction: 'gte', action: 'split', basicAction: 'stand', label: '10,10 vs 6 → Split' },
  { id: 'i18-10v10', group: 'I18', handType: 'hard', total: 10, dealerUpcard: 10, index: 4, direction: 'gte', action: 'double', basicAction: 'hit', label: '10 vs 10 → Double' },
  { id: 'i18-12v3', group: 'I18', handType: 'hard', total: 12, dealerUpcard: 3, index: 2, direction: 'gte', action: 'stand', basicAction: 'hit', label: '12 vs 3 → Stand' },
  { id: 'i18-12v2', group: 'I18', handType: 'hard', total: 12, dealerUpcard: 2, index: 3, direction: 'gte', action: 'stand', basicAction: 'hit', label: '12 vs 2 → Stand' },
  { id: 'i18-11vA', group: 'I18', handType: 'hard', total: 11, dealerUpcard: 11, index: 1, direction: 'gte', action: 'double', basicAction: 'hit', label: '11 vs A → Double' },
  { id: 'i18-9v2', group: 'I18', handType: 'hard', total: 9, dealerUpcard: 2, index: 1, direction: 'gte', action: 'double', basicAction: 'hit', label: '9 vs 2 → Double' },
  { id: 'i18-10vA', group: 'I18', handType: 'hard', total: 10, dealerUpcard: 11, index: 4, direction: 'gte', action: 'double', basicAction: 'hit', label: '10 vs A → Double' },
  { id: 'i18-9v7', group: 'I18', handType: 'hard', total: 9, dealerUpcard: 7, index: 3, direction: 'gte', action: 'double', basicAction: 'hit', label: '9 vs 7 → Double' },
  { id: 'i18-16v9', group: 'I18', handType: 'hard', total: 16, dealerUpcard: 9, index: 5, direction: 'gte', action: 'stand', basicAction: 'hit', label: '16 vs 9 → Stand' },
  // Negative/low-index plays: deviate when TC <= index.
  { id: 'i18-13v2', group: 'I18', handType: 'hard', total: 13, dealerUpcard: 2, index: -1, direction: 'lte', action: 'hit', basicAction: 'stand', label: '13 vs 2 → Hit' },
  { id: 'i18-12v4', group: 'I18', handType: 'hard', total: 12, dealerUpcard: 4, index: 0, direction: 'lte', action: 'hit', basicAction: 'stand', label: '12 vs 4 → Hit' },
  { id: 'i18-12v5', group: 'I18', handType: 'hard', total: 12, dealerUpcard: 5, index: -2, direction: 'lte', action: 'hit', basicAction: 'stand', label: '12 vs 5 → Hit' },
  { id: 'i18-12v6', group: 'I18', handType: 'hard', total: 12, dealerUpcard: 6, index: -1, direction: 'lte', action: 'hit', basicAction: 'stand', label: '12 vs 6 → Hit' },
  { id: 'i18-13v3', group: 'I18', handType: 'hard', total: 13, dealerUpcard: 3, index: -2, direction: 'lte', action: 'hit', basicAction: 'stand', label: '13 vs 3 → Hit' },
]

/** Fab 4 — late-surrender deviations (S17 indices). Deviate when TC >= index. */
export const FAB_4: readonly Deviation[] = [
  { id: 'fab4-15v10', group: 'Fab4', handType: 'hard', total: 15, dealerUpcard: 10, index: 0, direction: 'gte', action: 'surrender', basicAction: 'surrender', label: '15 vs 10 → Surrender' },
  { id: 'fab4-15vA', group: 'Fab4', handType: 'hard', total: 15, dealerUpcard: 11, index: 1, direction: 'gte', action: 'surrender', basicAction: 'hit', label: '15 vs A → Surrender' },
  { id: 'fab4-15v9', group: 'Fab4', handType: 'hard', total: 15, dealerUpcard: 9, index: 2, direction: 'gte', action: 'surrender', basicAction: 'hit', label: '15 vs 9 → Surrender' },
  { id: 'fab4-14v10', group: 'Fab4', handType: 'hard', total: 14, dealerUpcard: 10, index: 3, direction: 'gte', action: 'surrender', basicAction: 'hit', label: '14 vs 10 → Surrender' },
]

/** All play deviations (Fab 4 first so surrender wins ties when available). */
export const ALL_DEVIATIONS: readonly Deviation[] = [...FAB_4, ...ILLUSTRIOUS_18]

/**
 * Hand evaluation. Pure functions over arrays of cards.
 *
 * "Soft" means at least one ace is currently counted as 11 without busting.
 * The best total is always the highest value ≤ 21 achievable; if every ace
 * must be 1 to stay ≤ 21 (or the hand is already bust), the hand is hard.
 */

import { cardValue } from './cards'
import type { Card } from './types'

export interface HandValue {
  /** Best total ≤ 21 when possible; otherwise the minimum (bust) total. */
  readonly total: number
  /** True when an ace is counted as 11 in the reported total. */
  readonly soft: boolean
}

/**
 * Evaluate a hand's total and soft/hard status.
 *
 * Start with every ace as 11, then demote aces to 1 (subtract 10) while the
 * total exceeds 21. The hand is soft if any ace remains valued at 11.
 */
export function evaluateHand(cards: readonly Card[]): HandValue {
  let total = 0
  let aces = 0

  for (const card of cards) {
    total += cardValue(card.rank)
    if (card.rank === 'A') aces++
  }

  // Demote aces from 11 to 1 (−10 each) until we're ≤ 21 or out of aces.
  let acesAsEleven = aces
  while (total > 21 && acesAsEleven > 0) {
    total -= 10
    acesAsEleven--
  }

  return { total, soft: acesAsEleven > 0 }
}

/** Convenience: best total only. */
export function handTotal(cards: readonly Card[]): number {
  return evaluateHand(cards).total
}

/** A natural blackjack: exactly two cards totalling 21. */
export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21
}

/** Bust: best total exceeds 21. */
export function isBust(cards: readonly Card[]): boolean {
  return handTotal(cards) > 21
}

/**
 * Splittable pair: exactly two cards of equal *rank-value*. This treats any
 * two ten-valued cards (e.g. K + 10) as a pair, matching common casino rules
 * where any two ten-value cards may be split.
 */
export function isPair(cards: readonly Card[]): boolean {
  if (cards.length !== 2) return false
  const [a, b] = cards
  if (!a || !b) return false
  return cardValue(a.rank) === cardValue(b.rank)
}

/**
 * Round orchestration: a blackjack session over a single shoe.
 *
 * The Game owns the shoe, bankroll, and running count, and drives one round at
 * a time through a small state machine: deal → player turn(s) → dealer turn →
 * settled. Splitting, doubling, late surrender, dealer peek, and 3:2 / 6:5
 * payouts are all handled here. It is pure TypeScript (no DOM) and deterministic
 * given a seeded RNG, so it is fully unit-testable.
 *
 * Counting: cards are added to the running count as they become VISIBLE — both
 * initial player cards and the dealer upcard at the deal, the hole card when the
 * dealer reveals, and every hit/draw. This mirrors how a counter sees the table.
 */

import { computeCountState, type DeckRoundingMode } from './count'
import { cardValue } from './cards'
import {
  type CountingSystem,
  DEFAULT_COUNTING_SYSTEM,
} from '../data/countingSystems'
import { evaluateHand, isBlackjack, isPair } from './hand'
import { createRng, type Rng } from './rng'
import { DEFAULT_RULES, type TableRules } from './rules'
import { type CardSource, Shoe } from './shoe'
import type { Action, Card } from './types'

export type Outcome =
  | 'blackjack'
  | 'win'
  | 'push'
  | 'lose'
  | 'surrender'

export type RoundPhase = 'player' | 'dealer' | 'settled'

export interface PlayerHand {
  cards: Card[]
  /** Total wagered on this hand (doubles to 2× when doubled). */
  bet: number
  doubled: boolean
  surrendered: boolean
  /** Came from splitting a pair. */
  fromSplit: boolean
  /** Came from splitting aces (one card only, then auto-stand). */
  fromSplitAce: boolean
  /** No further actions allowed on this hand. */
  finished: boolean
  outcome?: Outcome
  /** Amount returned to the bankroll on settle (0 = total loss). */
  payout?: number
}

export interface DealerHand {
  cards: Card[]
  holeHidden: boolean
}

export interface RoundState {
  phase: RoundPhase
  hands: PlayerHand[]
  /** Index of the hand currently being played during the player turn. */
  activeHandIndex: number
  dealer: DealerHand
  /** Insurance is offered (dealer shows an Ace) and not yet decided. */
  insuranceOffered: boolean
  insuranceBet: number
}

export interface GameConfig {
  rules?: TableRules
  countingSystem?: CountingSystem
  /** RNG or a seed for deterministic shoes. */
  rng?: Rng
  seed?: number | string
  startingBankroll?: number
  /** Rounding for the displayed true count (engine default: exact). */
  deckRoundingMode?: DeckRoundingMode
  /** Custom card source (e.g. a stacked deck for tests). Defaults to a Shoe. */
  cardSource?: CardSource
  /**
   * When true, the dealer does NOT play out automatically at the end of the
   * player turn. The caller drives it one visible step at a time via
   * {@link Game.advanceDealer}, so the UI can animate each card and the running
   * count ticks up exactly as each card is exposed. Defaults to false.
   */
  manualDealer?: boolean
}

/** Result of a single {@link Game.advanceDealer} step. */
export type DealerStep = 'reveal' | 'hit' | 'done'

export class Game {
  readonly rules: TableRules
  readonly countingSystem: CountingSystem

  private readonly shoe: CardSource
  private readonly deckRoundingMode: DeckRoundingMode
  private readonly manualDealer: boolean
  private readonly startingBankroll: number
  private _bankroll: number
  private _runningCount = 0
  private _roundsPlayed = 0
  private _round: RoundState | null = null

  constructor(config: GameConfig = {}) {
    this.rules = config.rules ?? DEFAULT_RULES
    this.countingSystem = config.countingSystem ?? DEFAULT_COUNTING_SYSTEM
    this.deckRoundingMode = config.deckRoundingMode ?? 'exact'
    this.manualDealer = config.manualDealer ?? false
    this.startingBankroll = config.startingBankroll ?? 1000
    this._bankroll = this.startingBankroll
    const rng = config.rng ?? createRng(config.seed ?? 'blackjack')
    this.shoe =
      config.cardSource ??
      new Shoe({
        decks: this.rules.decks,
        penetration: this.rules.penetration,
        rng,
      })
  }

  // ---- Read-only state ---------------------------------------------------

  get bankroll(): number {
    return this._bankroll
  }

  get runningCount(): number {
    return this._runningCount
  }

  get cardsRemaining(): number {
    return this.shoe.cardsRemaining
  }

  /** Total cards in a full shoe (decks × 52). */
  get shoeSize(): number {
    return this.rules.decks * 52
  }

  /** Rounds settled so far this session. */
  get roundsPlayed(): number {
    return this._roundsPlayed
  }

  get count() {
    return computeCountState(
      this._runningCount,
      this.shoe.cardsRemaining,
      this.deckRoundingMode,
    )
  }

  get round(): RoundState | null {
    return this._round
  }

  get needsReshuffle(): boolean {
    return this.shoe.needsReshuffle
  }

  // ---- Shoe / count ------------------------------------------------------

  /** Reshuffle the shoe and reset the running count (a fresh shoe sums to 0). */
  reshuffle(): void {
    this.shoe.reshuffle()
    this._runningCount = 0
  }

  /**
   * Restore the bankroll to its starting amount (a practice "rebuy"). Only
   * allowed between rounds, never mid-hand.
   */
  resetBankroll(): void {
    if (this._round && this._round.phase !== 'settled') {
      throw new Error('cannot reset bankroll mid-round')
    }
    this._bankroll = this.startingBankroll
  }

  /** Draw a card and add it to the running count (it is now visible). */
  private drawVisible(): Card {
    const card = this.shoe.deal()
    this._runningCount += this.countingSystem.values[card.rank]
    return card
  }

  // ---- Round lifecycle ---------------------------------------------------

  /**
   * Start a new round with the given bet. Deals two cards to the player and
   * dealer (hole card hidden) and applies the dealer peek rule.
   */
  startRound(bet: number): RoundState {
    if (bet <= 0) throw new RangeError('bet must be positive')
    if (bet > this._bankroll) throw new RangeError('bet exceeds bankroll')
    if (this._round && this._round.phase !== 'settled') {
      throw new Error('previous round is still in progress')
    }

    this._bankroll -= bet

    // Deal order: player, dealer up, player, dealer hole.
    const playerCards = [this.drawVisible()]
    const dealerUp = this.drawVisible()
    playerCards.push(this.drawVisible())
    const hole = this.shoe.deal() // hidden — NOT counted yet

    const hand: PlayerHand = {
      cards: playerCards,
      bet,
      doubled: false,
      surrendered: false,
      fromSplit: false,
      fromSplitAce: false,
      finished: false,
    }

    const round: RoundState = {
      phase: 'player',
      hands: [hand],
      activeHandIndex: 0,
      dealer: { cards: [dealerUp, hole], holeHidden: true },
      insuranceOffered: dealerUp.rank === 'A',
      insuranceBet: 0,
    }
    this._round = round

    // When the dealer shows an Ace, insurance is offered FIRST; the peek
    // happens once the player decides (see takeInsurance). For a ten-value
    // upcard the dealer peeks immediately.
    if (!round.insuranceOffered) {
      this.resolvePeek()
    }

    return round
  }

  /**
   * Resolve the dealer's hole-card check and any immediate naturals.
   *
   * The hole card is only revealed/counted when it is actually exposed:
   * a dealer blackjack. A player natural with no dealer blackjack pays
   * immediately and the hole stays face-down (unseen → uncounted), matching
   * casino practice.
   */
  private resolvePeek(): void {
    const round = this._round!
    const dealerUp = round.dealer.cards[0]!
    const canHaveBlackjack =
      dealerUp.rank === 'A' || cardValue(dealerUp.rank) === 10

    if (canHaveBlackjack && isBlackjack(round.dealer.cards)) {
      this.revealHole()
      this.settle()
      return
    }
    // No dealer blackjack. A single natural hand resolves now (hole unseen).
    const player = round.hands[0]!
    if (round.hands.length === 1 && isBlackjack(player.cards)) {
      this.settle()
    }
  }

  /** Actions available to the active hand right now. */
  availableActions(): Action[] {
    const round = this._round
    if (!round || round.phase !== 'player') return []
    const hand = round.hands[round.activeHandIndex]
    if (!hand || hand.finished) return []

    const actions: Action[] = ['hit', 'stand']
    const isInitialTwo = hand.cards.length === 2

    if (isInitialTwo && this.canAffordExtra(hand.bet)) {
      const dasOk = !hand.fromSplit || this.rules.doubleAfterSplit
      if (dasOk && !hand.fromSplitAce) actions.push('double')
    }
    if (
      isInitialTwo &&
      isPair(hand.cards) &&
      round.hands.length < this.rules.maxSplitHands &&
      this.canAffordExtra(hand.bet)
    ) {
      actions.push('split')
    }
    if (
      this.rules.lateSurrender &&
      isInitialTwo &&
      !hand.fromSplit &&
      round.hands.length === 1
    ) {
      actions.push('surrender')
    }
    return actions
  }

  private canAffordExtra(bet: number): boolean {
    return this._bankroll >= bet
  }

  private requireActiveHand(action: Action): PlayerHand {
    const round = this._round
    if (!round || round.phase !== 'player') {
      throw new Error(`cannot ${action}: not in player turn`)
    }
    const hand = round.hands[round.activeHandIndex]
    if (!hand || hand.finished) {
      throw new Error(`cannot ${action}: no active hand`)
    }
    if (!this.availableActions().includes(action)) {
      throw new Error(`cannot ${action}: not an available action`)
    }
    return hand
  }

  /** Perform an action by name (single dispatch shared by the UI and sim). */
  perform(action: Action): void {
    switch (action) {
      case 'hit':
        return this.hit()
      case 'stand':
        return this.stand()
      case 'double':
        return this.double()
      case 'split':
        return this.split()
      case 'surrender':
        return this.surrender()
    }
  }

  hit(): void {
    const hand = this.requireActiveHand('hit')
    hand.cards.push(this.drawVisible())
    if (evaluateHand(hand.cards).total >= 21) {
      this.finishHand()
    }
  }

  stand(): void {
    this.requireActiveHand('stand')
    this.finishHand()
  }

  double(): void {
    const hand = this.requireActiveHand('double')
    this._bankroll -= hand.bet
    hand.bet *= 2
    hand.doubled = true
    hand.cards.push(this.drawVisible())
    this.finishHand()
  }

  surrender(): void {
    const hand = this.requireActiveHand('surrender')
    hand.surrendered = true
    this.finishHand()
  }

  split(): void {
    const hand = this.requireActiveHand('split')
    const round = this._round!
    const isAces = hand.cards[0]!.rank === 'A'

    // Move the second card into a new hand placed right after the current one.
    const movedCard = hand.cards.pop()!
    this._bankroll -= hand.bet
    const newHand: PlayerHand = {
      cards: [movedCard],
      bet: hand.bet,
      doubled: false,
      surrendered: false,
      fromSplit: true,
      fromSplitAce: isAces,
      finished: false,
    }
    hand.fromSplit = true
    hand.fromSplitAce = isAces
    round.hands.splice(round.activeHandIndex + 1, 0, newHand)

    // Deal one card to each split hand.
    hand.cards.push(this.drawVisible())
    newHand.cards.push(this.drawVisible())

    // Split aces receive exactly one card each and then stand.
    if (isAces) {
      hand.finished = true
      newHand.finished = true
      this.advanceToNextHand()
    }
  }

  /** Mark the active hand finished and advance the turn. */
  private finishHand(): void {
    const round = this._round!
    round.hands[round.activeHandIndex]!.finished = true
    this.advanceToNextHand()
  }

  private advanceToNextHand(): void {
    const round = this._round!
    let i = round.activeHandIndex
    while (i < round.hands.length && round.hands[i]!.finished) i++
    if (i < round.hands.length) {
      round.activeHandIndex = i
    } else {
      this.playDealer()
    }
  }

  // ---- Dealer turn & settlement -----------------------------------------

  private revealHole(): void {
    const round = this._round!
    if (!round.dealer.holeHidden) return
    round.dealer.holeHidden = false
    // The hole card becomes visible — count it now.
    const hole = round.dealer.cards[1]!
    this._runningCount += this.countingSystem.values[hole.rank]
  }

  private playDealer(): void {
    const round = this._round!
    round.phase = 'dealer'

    // In manual mode the caller drives the dealer one step at a time so the UI
    // can animate each card; we just enter the dealer phase and wait.
    if (this.manualDealer) return

    // Dealer only exposes the hole and draws if at least one hand still needs
    // comparison. If every hand busted/surrendered, the hole stays unseen
    // (uncounted) and the dealer simply wins.
    const needsPlay = this.dealerNeedsToPlay()
    if (needsPlay) {
      this.revealHole()
      while (this.dealerShouldHit(round.dealer.cards)) {
        round.dealer.cards.push(this.drawVisible())
      }
    }
    this.settle()
  }

  private dealerNeedsToPlay(): boolean {
    const round = this._round!
    return round.hands.some(
      (h) => !h.surrendered && !this.isBust(h) && !this.isNatural(h),
    )
  }

  /**
   * Advance the dealer's turn by ONE visible step (manual mode). Returns:
   *   'reveal' — the hole card was just exposed (and counted)
   *   'hit'    — the dealer drew one card (and counted it)
   *   'done'   — the dealer is finished and the round is settled
   *
   * The UI calls this on a timer until it returns 'done', animating each card.
   */
  advanceDealer(): DealerStep {
    const round = this._round
    if (!round || round.phase === 'settled') return 'done'
    if (round.phase !== 'dealer') {
      throw new Error('cannot advance dealer: not the dealer turn')
    }

    // No hand left to beat → settle without exposing the hole.
    if (!this.dealerNeedsToPlay()) {
      this.settle()
      return 'done'
    }
    if (round.dealer.holeHidden) {
      this.revealHole()
      return 'reveal'
    }
    if (this.dealerShouldHit(round.dealer.cards)) {
      round.dealer.cards.push(this.drawVisible())
      return 'hit'
    }
    this.settle()
    return 'done'
  }

  private dealerShouldHit(cards: Card[]): boolean {
    const { total, soft } = evaluateHand(cards)
    if (total < 17) return true
    if (total === 17 && soft && this.rules.dealerHitsSoft17) return true
    return false
  }

  private isBust(hand: PlayerHand): boolean {
    return evaluateHand(hand.cards).total > 21
  }

  /** A natural blackjack: original unsplit two-card 21. */
  private isNatural(hand: PlayerHand): boolean {
    return !hand.fromSplit && isBlackjack(hand.cards)
  }

  private settle(): void {
    const round = this._round!
    const dealer = round.dealer
    const dealerTotal = evaluateHand(dealer.cards).total
    const dealerBust = dealerTotal > 21
    const dealerBlackjack = isBlackjack(dealer.cards)

    for (const hand of round.hands) {
      const { outcome, payout } = this.resolveHand(
        hand,
        dealerTotal,
        dealerBust,
        dealerBlackjack,
      )
      hand.outcome = outcome
      hand.payout = payout
      this._bankroll += payout
    }

    // Insurance settles separately: pays 2:1 when the dealer has blackjack.
    if (round.insuranceBet > 0) {
      this._bankroll += dealerBlackjack ? round.insuranceBet * 3 : 0
    }

    round.phase = 'settled'
    this._roundsPlayed++
  }

  private resolveHand(
    hand: PlayerHand,
    dealerTotal: number,
    dealerBust: boolean,
    dealerBlackjack: boolean,
  ): { outcome: Outcome; payout: number } {
    if (hand.surrendered) {
      return { outcome: 'surrender', payout: hand.bet / 2 }
    }

    const playerTotal = evaluateHand(hand.cards).total
    if (playerTotal > 21) {
      return { outcome: 'lose', payout: 0 }
    }

    if (this.isNatural(hand)) {
      if (dealerBlackjack) return { outcome: 'push', payout: hand.bet }
      return {
        outcome: 'blackjack',
        payout: hand.bet * (1 + this.rules.blackjackPayout),
      }
    }

    // A dealer blackjack beats any non-natural hand.
    if (dealerBlackjack) return { outcome: 'lose', payout: 0 }

    if (dealerBust || playerTotal > dealerTotal) {
      return { outcome: 'win', payout: hand.bet * 2 }
    }
    if (playerTotal === dealerTotal) {
      return { outcome: 'push', payout: hand.bet }
    }
    return { outcome: 'lose', payout: 0 }
  }

  // ---- Insurance ---------------------------------------------------------

  /**
   * Take or decline insurance (only while offered, before playing). Insurance
   * costs half the original bet and pays 2:1 if the dealer has blackjack.
   */
  takeInsurance(take: boolean): void {
    const round = this._round
    if (!round || !round.insuranceOffered) {
      throw new Error('insurance is not offered')
    }
    if (take) {
      const insuranceBet = round.hands[0]!.bet / 2
      if (insuranceBet > this._bankroll) {
        throw new RangeError('cannot afford insurance')
      }
      this._bankroll -= insuranceBet
      round.insuranceBet = insuranceBet
    }
    round.insuranceOffered = false
    // Now that insurance is decided, the dealer peeks.
    this.resolvePeek()
  }
}

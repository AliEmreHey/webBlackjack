import { describe, it, expect } from 'vitest'
import { Game } from './game'
import { DEFAULT_RULES, type TableRules } from './rules'
import type { Card } from './types'
import { StackedDeck, c } from '../test/stackedDeck'

const gameWith = (rules: Partial<TableRules>, cards: Card[], bankroll = 1000) =>
  new Game({
    cardSource: new StackedDeck(cards),
    startingBankroll: bankroll,
    rules: { ...DEFAULT_RULES, ...rules },
  })

// Deal order consumed by startRound: player1, dealerUp, player2, hole, then
// any action draws, then dealer draws.
const game = (cards: Card[], bankroll = 1000) =>
  new Game({ cardSource: new StackedDeck(cards), startingBankroll: bankroll })

describe('player natural blackjack', () => {
  it('pays 3:2 and leaves the hole uncounted (dealer 9 up)', () => {
    const g = game([c('A'), c('9'), c('K'), c('5')])
    const round = g.startRound(100)
    expect(round.phase).toBe('settled')
    expect(round.hands[0]!.outcome).toBe('blackjack')
    // 1000 − 100 bet + 250 (100 × 2.5) = 1150
    expect(g.bankroll).toBe(1150)
    // Counted: A(−1) + 9(0) + K(−1) = −2. Hole (5) stays face-down.
    expect(g.runningCount).toBe(-2)
    expect(round.dealer.holeHidden).toBe(true)
  })
})

describe('dealer blackjack with insurance', () => {
  it('offers insurance on an Ace, pays 2:1 when dealer has blackjack', () => {
    const g = game([c('10'), c('A'), c('7'), c('K')])
    const round = g.startRound(100)
    // Peek is deferred until insurance is decided.
    expect(round.insuranceOffered).toBe(true)
    expect(round.phase).toBe('player')

    g.takeInsurance(true)
    expect(round.phase).toBe('settled')
    expect(round.hands[0]!.outcome).toBe('lose')
    // 1000 − 100 bet − 50 insurance + 150 insurance payout = 1000 (break-even)
    expect(g.bankroll).toBe(1000)
    // A(−1)+10(−1)+7(0) on deal = −2, then hole K(−1) revealed = −3
    expect(g.runningCount).toBe(-3)
  })

  it('declining insurance against a non-blackjack dealer continues play', () => {
    const g = game([c('10'), c('A'), c('7'), c('5')])
    const round = g.startRound(100)
    g.takeInsurance(false)
    expect(round.phase).toBe('player')
    expect(g.availableActions()).toContain('hit')
  })
})

describe('dealer busts', () => {
  it('player stands on 17 and wins when the dealer busts', () => {
    // player 10,7=17; dealer up 6, hole 10 (16) draws 8 → 24 bust
    const g = game([c('10'), c('6'), c('7'), c('10'), c('8')])
    const round = g.startRound(100)
    g.stand()
    expect(round.phase).toBe('settled')
    expect(round.hands[0]!.outcome).toBe('win')
    expect(g.bankroll).toBe(1100) // −100 + 200
    // deal: 10(−1)+6(+1)+7(0)=0; hole 10(−1)=−1; draw 8(0)=−1
    expect(g.runningCount).toBe(-1)
  })
})

describe('double down', () => {
  it('doubles the bet, draws one card, then the dealer plays', () => {
    // player 5,6=11; dealer up 6, hole 10; double card 9 → 20; dealer draws 10 → bust
    const g = game([c('5'), c('6'), c('6'), c('10'), c('9'), c('10')])
    const round = g.startRound(100)
    expect(g.availableActions()).toContain('double')
    g.double()
    expect(round.hands[0]!.doubled).toBe(true)
    expect(round.hands[0]!.bet).toBe(200)
    expect(round.phase).toBe('settled')
    expect(round.hands[0]!.outcome).toBe('win')
    expect(g.bankroll).toBe(1200) // −100 −100 + 400
  })
})

describe('splitting', () => {
  it('splits a pair into two hands, deducting a second bet', () => {
    // player 8,8; dealer up 5, hole 6; split draws 3 and 2;
    // hand1 8,3=11 stand; hand2 8,2=10 stand; dealer 11 draws 10 → 21
    const g = game([
      c('8'), c('5'), c('8'), c('6'),
      c('3'), c('2'), // split cards
      c('10'), // dealer draw to 11+10... hole is 6 → 5,6=11, draw 10 = 21
    ])
    const round = g.startRound(100)
    expect(g.availableActions()).toContain('split')
    g.split()
    expect(round.hands).toHaveLength(2)
    expect(round.hands[0]!.bet).toBe(100)
    expect(round.hands[1]!.bet).toBe(100)
    g.stand() // hand 1
    g.stand() // hand 2
    expect(round.phase).toBe('settled')
    // dealer 5,6=11 +10 = 21; both player hands (11,10) lose
    expect(g.bankroll).toBe(800) // −100 −100, both lose
    expect(round.hands.every((h) => h.outcome === 'lose')).toBe(true)
  })

  it('split aces get one card each and auto-finish', () => {
    // player A,A; dealer up 9, hole 7 (16) draws 8 → 24 bust
    const g = game([
      c('A'), c('9'), c('A'), c('7'),
      c('5'), c('4'), // one card to each split ace
      c('8'), // dealer draw 16 → 24 bust
    ])
    const round = g.startRound(100)
    g.split()
    // Both hands finished automatically; dealer played; round settled.
    expect(round.phase).toBe('settled')
    expect(round.hands).toHaveLength(2)
    expect(round.hands[0]!.fromSplitAce).toBe(true)
    // A,5=16 and A,4=15; dealer busts → both win
    expect(round.hands.every((h) => h.outcome === 'win')).toBe(true)
    expect(g.bankroll).toBe(1200) // −200 + 400
  })
})

describe('rule variations', () => {
  it('pays 6:5 on a blackjack when configured', () => {
    const g = gameWith({ blackjackPayout: 1.2 }, [c('A'), c('9'), c('K'), c('5')])
    const round = g.startRound(100)
    expect(round.hands[0]!.outcome).toBe('blackjack')
    // 1000 − 100 + 100×2.2 = 1120
    expect(g.bankroll).toBe(1120)
  })

  it('H17: dealer hits soft 17 (and can beat an 18)', () => {
    // player 10,8=18 stand; dealer up 6, hole A = soft 17, hits 4 → 21
    const cards = [c('10'), c('6'), c('8'), c('A'), c('4')]
    const h17 = gameWith({ dealerHitsSoft17: true }, cards)
    h17.startRound(100)
    h17.stand()
    expect(h17.round!.hands[0]!.outcome).toBe('lose') // dealer made 21

    // Same cards under S17: dealer stands on soft 17, player 18 wins.
    const s17 = gameWith({ dealerHitsSoft17: false }, cards)
    s17.startRound(100)
    s17.stand()
    expect(s17.round!.hands[0]!.outcome).toBe('win')
  })

  it('surrender returns half the bet', () => {
    // 16 vs 10, late surrender available; dealer hole 5 (no blackjack)
    const g = game([c('10'), c('10'), c('6'), c('5')])
    g.startRound(100)
    expect(g.availableActions()).toContain('surrender')
    g.surrender()
    expect(g.round!.hands[0]!.outcome).toBe('surrender')
    expect(g.bankroll).toBe(950) // −100 + 50
  })

  it('DAS off: no double after a split', () => {
    // 8,8 vs 5; split deals 3 and 2
    const cards = [c('8'), c('5'), c('8'), c('6'), c('3'), c('2')]
    const g = gameWith({ doubleAfterSplit: false }, cards)
    g.startRound(100)
    g.split()
    expect(g.availableActions()).not.toContain('double')
  })

  it('allows re-splitting up to the limit', () => {
    // 8,8 vs 5; first split hand draws another 8 → can split again
    const cards = [c('8'), c('5'), c('8'), c('6'), c('8'), c('2')]
    const g = game(cards)
    g.startRound(100)
    g.split()
    // Active hand is 8,8 again → re-split available (2 of 4 hands).
    expect(g.availableActions()).toContain('split')
  })
})

describe('perform & resetBankroll', () => {
  it('perform(action) dispatches like the named methods', () => {
    const g = game([c('10'), c('9'), c('8'), c('9')])
    g.startRound(100)
    g.perform('stand')
    expect(g.round!.phase).toBe('settled')
  })

  it('resetBankroll restores the starting amount between rounds', () => {
    // player 17 vs dealer 19 → loses 100
    const g = game([c('10'), c('10'), c('7'), c('9')])
    g.startRound(100)
    g.stand()
    expect(g.bankroll).toBe(900)
    g.resetBankroll()
    expect(g.bankroll).toBe(1000)
  })

  it('resetBankroll throws mid-round', () => {
    const g = game([c('10'), c('9'), c('8'), c('9')])
    g.startRound(100)
    expect(() => g.resetBankroll()).toThrow()
  })
})

describe('progress tracking', () => {
  it('counts settled rounds and exposes shoe size', () => {
    const g = game([c('10'), c('9'), c('8'), c('9')])
    expect(g.shoeSize).toBe(312) // default 6 decks
    expect(g.roundsPlayed).toBe(0)
    g.startRound(100)
    g.stand()
    expect(g.roundsPlayed).toBe(1)
  })
})

describe('push', () => {
  it('returns the bet when player and dealer tie', () => {
    // player 10,8=18; dealer up 9, hole 9 = 18 stand
    const g = game([c('10'), c('9'), c('8'), c('9')])
    const round = g.startRound(100)
    g.stand()
    expect(round.hands[0]!.outcome).toBe('push')
    expect(g.bankroll).toBe(1000) // bet returned
  })
})

describe('manual dealer (stepwise play-out)', () => {
  const manual = (cards: Card[]) =>
    new Game({
      cardSource: new StackedDeck(cards),
      startingBankroll: 1000,
      manualDealer: true,
    })

  it('waits for advanceDealer and reveals/draws one card per step', () => {
    // player 10,7=17 stand; dealer up 6, hole 10 (16) draws 8 → 24 bust
    const g = manual([c('10'), c('6'), c('7'), c('10'), c('8')])
    const round = g.startRound(100)
    g.stand()
    // Player turn over, but the dealer has NOT played yet.
    expect(round.phase).toBe('dealer')
    expect(round.dealer.holeHidden).toBe(true)
    expect(g.runningCount).toBe(0) // 10(−1)+6(+1)+7(0); hole not yet seen

    expect(g.advanceDealer()).toBe('reveal')
    expect(round.dealer.holeHidden).toBe(false)
    expect(g.runningCount).toBe(-1) // hole 10 now counted

    expect(g.advanceDealer()).toBe('hit')
    expect(round.dealer.cards).toHaveLength(3)
    expect(g.runningCount).toBe(-1) // drew 8 (0)

    expect(g.advanceDealer()).toBe('done')
    expect(round.phase).toBe('settled')
    expect(round.hands[0]!.outcome).toBe('win')
  })

  it('settles without revealing the hole when every hand busted', () => {
    // player 10,6=16 hits 10 → 26 bust; dealer up 9, hole 5
    const g = manual([c('10'), c('9'), c('6'), c('5'), c('10')])
    const round = g.startRound(100)
    g.hit() // 26 → bust → dealer phase
    expect(round.phase).toBe('dealer')
    expect(g.advanceDealer()).toBe('done')
    expect(round.dealer.holeHidden).toBe(true) // never exposed
    expect(round.hands[0]!.outcome).toBe('lose')
  })
})

describe('availableActions & guards', () => {
  it('rejects illegal actions', () => {
    const g = game([c('10'), c('9'), c('8'), c('9')])
    g.startRound(100)
    g.stand()
    expect(() => g.hit()).toThrow() // round settled
  })

  it('rejects a bet larger than the bankroll', () => {
    const g = game([c('10'), c('9'), c('8'), c('9')], 50)
    expect(() => g.startRound(100)).toThrow(RangeError)
  })
})

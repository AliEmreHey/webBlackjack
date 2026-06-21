import { useEffect, useState } from 'react'
import { useGame } from './hooks/useGame'
import type { GameConfig } from '../engine/game'
import { evaluateHand } from '../engine/hand'
import type { Card } from '../engine/types'
import type { Action } from '../engine/types'
import { HandView } from './components/HandView'
import { CountDisplay } from './components/CountDisplay'
import { BetControls } from './components/BetControls'
import { ShoeMeter } from './components/ShoeMeter'

const ACTION_LABEL: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
}

// Color-coded so Double (the money move) and Split read at a glance.
const ACTION_STYLE: Record<Action, string> = {
  hit: 'bg-act-hit text-chalk',
  stand: 'bg-act-stand text-chalk',
  double: 'bg-brass text-felt-deep',
  split: 'bg-act-split text-chalk',
  surrender: 'bg-act-surrender text-chalk',
}

// Show actions in a stable, conventional order regardless of engine order.
const ACTION_ORDER: Action[] = ['hit', 'stand', 'double', 'split', 'surrender']

const MIN_BET = 5
const DEFAULT_BET = 10
const BET_STEP = 5

/** Describe a hand's total, e.g. "18", "Soft 18", "Bust (22)". */
function totalLabel(cards: readonly Card[]): string {
  const { total, soft } = evaluateHand(cards)
  if (total > 21) return `Bust ${total}`
  return soft ? `Soft ${total}` : `${total}`
}

interface PlayModeProps {
  config?: GameConfig
  /** Delay between dealer reveal/draw steps, in ms. */
  dealerStepMs?: number
}

export function PlayMode({ config, dealerStepMs = 650 }: PlayModeProps = {}) {
  const g = useGame({ startingBankroll: 1000, manualDealer: true, ...config })
  const [bet, setBet] = useState(DEFAULT_BET)
  const [countShown, setCountShown] = useState(false)

  const round = g.round
  const inRound = round !== null && round.phase !== 'settled'
  const settled = round !== null && round.phase === 'settled'
  const dealerTurn = round?.phase === 'dealer'

  // Drive the dealer one visible card at a time during its turn.
  const dealerCardCount = round?.dealer.cards.length ?? 0
  const holeHidden = round?.dealer.holeHidden ?? true
  useEffect(() => {
    if (!dealerTurn) return
    const id = setTimeout(() => g.advanceDealer(), dealerStepMs)
    return () => clearTimeout(id)
    // Re-run after each step (phase / card count / hole reveal change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerTurn, dealerCardCount, holeHidden])
  const canDeal = !inRound && bet <= g.bankroll && bet > 0
  const broke = !inRound && g.bankroll < MIN_BET

  // Dealer display: hide the hole card and show only the upcard total until reveal.
  const dealerCards = round
    ? round.dealer.holeHidden
      ? [round.dealer.cards[0], undefined]
      : round.dealer.cards
    : []
  const dealerTotal = round
    ? round.dealer.holeHidden
      ? totalLabel([round.dealer.cards[0]!])
      : totalLabel(round.dealer.cards)
    : ''

  const orderedActions = ACTION_ORDER.filter((a) =>
    g.availableActions.includes(a),
  )

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-brass">
          Blackjack&nbsp;Trainer
        </h1>
        <span className="rounded-full border border-felt-line bg-felt-deep/60 px-3 py-1 text-sm text-chalk-dim">
          Bankroll{' '}
          <span className="font-mono font-bold text-chalk tabular-nums">
            ${g.bankroll}
          </span>
        </span>
      </header>

      <CountDisplay
        count={g.count}
        shown={countShown}
        onToggle={() => setCountShown((s) => !s)}
      />

      <ShoeMeter
        shoeSize={g.shoeSize}
        cardsRemaining={g.cardsRemaining}
        penetration={g.game.rules.penetration}
        roundsPlayed={g.roundsPlayed}
      />

      {/* The table */}
      <div className="flex flex-col gap-3 rounded-2xl border border-felt-line bg-felt-panel/50 p-4 shadow-inner shadow-black/30">
        {round ? (
          <>
            <HandView label="Dealer" cards={dealerCards} totalLabel={dealerTotal} />

            <div className="h-px bg-felt-line/60" />

            <div className="flex flex-col gap-2">
              {round.hands.map((hand, i) => (
                <HandView
                  key={i}
                  label={round.hands.length > 1 ? `Hand ${i + 1}` : 'You'}
                  cards={hand.cards}
                  totalLabel={totalLabel(hand.cards)}
                  active={inRound && i === round.activeHandIndex}
                  outcome={hand.outcome}
                  sublabel={`Bet $${hand.bet}${hand.doubled ? ' · doubled' : ''}`}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-chalk-dim/70">
            Place a bet and deal to start.
          </p>
        )}
      </div>

      {/* Insurance prompt */}
      {round?.insuranceOffered && (
        <div className="rounded-xl border border-brass/50 bg-brass/10 p-3">
          <p className="mb-2 text-sm text-brass-bright">
            Dealer shows an Ace. Insurance?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={g.bankroll < round.hands[0]!.bet / 2}
              onClick={() => g.takeInsurance(true)}
              className="rounded-lg bg-brass px-3 py-1.5 text-sm font-semibold text-felt-deep hover:bg-brass-bright disabled:cursor-not-allowed disabled:opacity-40"
            >
              Take insurance (€{round.hands[0]!.bet / 2})
            </button>
            <button
              type="button"
              onClick={() => g.takeInsurance(false)}
              className="rounded-lg bg-felt-raised px-3 py-1.5 text-sm font-medium text-chalk hover:brightness-110"
            >
              Decline
            </button>
          </div>
          {g.bankroll < round.hands[0]!.bet / 2 && (
            <p className="mt-2 text-xs text-chalk-dim/70">
              Not enough bankroll for insurance.
            </p>
          )}
        </div>
      )}

      {/* Dealer playing indicator */}
      {dealerTurn && (
        <p className="animate-pulse text-center text-sm font-medium tracking-wide text-brass">
          Dealer playing…
        </p>
      )}

      {/* Player actions */}
      {inRound && !dealerTurn && !round?.insuranceOffered && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {orderedActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => g.perform(action)}
              className={`rounded-lg px-4 py-3 font-semibold shadow-md shadow-black/30 transition hover:brightness-110 active:scale-[0.98] ${ACTION_STYLE[action]}`}
            >
              {ACTION_LABEL[action]}
            </button>
          ))}
        </div>
      )}

      {/* Betting / deal controls */}
      {!inRound && (
        <div className="flex flex-col gap-3 rounded-xl border border-felt-line bg-felt-panel/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-chalk-dim">Bet</span>
            <BetControls
              bet={bet}
              bankroll={g.bankroll}
              min={MIN_BET}
              step={BET_STEP}
              onChange={setBet}
            />
          </div>
          <div className="flex gap-2">
            {broke ? (
              <button
                type="button"
                onClick={() => g.resetBankroll()}
                className="flex-1 rounded-lg bg-brass px-4 py-3 font-bold uppercase tracking-wide text-felt-deep shadow-md shadow-black/30 transition hover:bg-brass-bright active:scale-[0.99]"
              >
                Reset bankroll
              </button>
            ) : (
              <button
                type="button"
                disabled={!canDeal}
                onClick={() => g.startRound(bet)}
                className="flex-1 rounded-lg bg-brass px-4 py-3 font-bold uppercase tracking-wide text-felt-deep shadow-md shadow-black/30 transition hover:bg-brass-bright active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {settled ? 'Next hand' : 'Deal'}
              </button>
            )}
            {g.needsReshuffle && (
              <button
                type="button"
                onClick={() => g.reshuffle()}
                className="rounded-lg bg-felt-raised px-4 py-3 font-medium text-chalk hover:brightness-110"
              >
                Reshuffle
              </button>
            )}
          </div>
          {broke && (
            <p className="text-xs text-act-surrender">
              You’re out of chips — reset your bankroll to keep practicing.
            </p>
          )}
          {g.needsReshuffle && !broke && (
            <p className="text-xs text-brass/80">
              Cut card reached — reshuffle resets the count.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

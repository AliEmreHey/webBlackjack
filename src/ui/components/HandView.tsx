import type { Card } from '../../engine/types'
import type { Outcome } from '../../engine/game'
import { CardView } from './CardView'

const OUTCOME_LABEL: Record<Outcome, string> = {
  blackjack: 'Blackjack! 3:2',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  surrender: 'Surrendered',
}

const OUTCOME_CLASS: Record<Outcome, string> = {
  blackjack: 'bg-brass text-felt-deep',
  win: 'bg-act-hit text-chalk',
  push: 'bg-felt-line text-chalk-dim',
  lose: 'bg-act-surrender text-chalk',
  surrender: 'bg-act-stand text-chalk',
}

interface HandViewProps {
  label: string
  /** Cards to show; `undefined` entries render face-down. */
  cards: (Card | undefined)[]
  totalLabel: string
  active?: boolean
  outcome?: Outcome
  sublabel?: string
}

export function HandView({
  label,
  cards,
  totalLabel,
  active,
  outcome,
  sublabel,
}: HandViewProps) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        active
          ? 'border-brass/70 bg-felt-raised shadow-lg shadow-black/30'
          : 'border-felt-line bg-felt-panel/70'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium tracking-wide text-chalk-dim">
          {label}
          <span className="ml-1.5 font-mono text-base font-semibold text-chalk">
            {totalLabel}
          </span>
        </span>
        {outcome && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${OUTCOME_CLASS[outcome]}`}
          >
            {OUTCOME_LABEL[outcome]}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {cards.map((card, i) => (
          <CardView key={i} card={card} index={i} />
        ))}
      </div>
      {sublabel && (
        <p className="mt-2 font-mono text-xs text-chalk-dim/80">{sublabel}</p>
      )}
    </div>
  )
}

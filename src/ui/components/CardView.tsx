import type { Card, Suit } from '../../engine/types'

const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds'

/** Stagger the deal-in animation for cards mounted together (initial deal). */
const staggerStyle = (index: number) => ({ animationDelay: `${index * 120}ms` })

/** A single playing card, or a face-down card when `card` is omitted. */
export function CardView({ card, index = 0 }: { card?: Card; index?: number }) {
  if (!card) {
    return (
      <div
        className="card-deal flex h-26 w-18 items-center justify-center rounded-lg border border-brass/30 bg-felt-raised shadow-lg shadow-black/40"
        style={staggerStyle(index)}
        aria-label="Face-down card"
      >
        <div className="h-[88%] w-[82%] rounded-md border border-brass/25 bg-[repeating-linear-gradient(45deg,rgba(217,164,65,0.18)_0,rgba(217,164,65,0.18)_4px,transparent_4px,transparent_8px)]" />
      </div>
    )
  }

  const color = isRed(card.suit) ? 'text-rose-600' : 'text-slate-900'
  return (
    <div
      className={`card-deal flex h-26 w-18 flex-col justify-between rounded-lg border border-slate-300 bg-white p-1.5 shadow-lg shadow-black/40 ${color}`}
      style={staggerStyle(index)}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="font-mono text-lg font-bold leading-none">
        {card.rank}
      </span>
      <span className="text-center text-2xl leading-none">
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span className="rotate-180 font-mono text-lg font-bold leading-none">
        {card.rank}
      </span>
    </div>
  )
}

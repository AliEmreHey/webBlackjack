interface ShoeMeterProps {
  shoeSize: number
  cardsRemaining: number
  /** Penetration fraction; the cut card sits at this point of the shoe. */
  penetration: number
  roundsPlayed: number
}

/**
 * Shoe progress: how many cards have been dealt out of the full shoe, with the
 * cut card marked, plus how many hands have been played this session.
 */
export function ShoeMeter({
  shoeSize,
  cardsRemaining,
  penetration,
  roundsPlayed,
}: ShoeMeterProps) {
  const dealt = shoeSize - cardsRemaining
  const dealtPct = (dealt / shoeSize) * 100
  const cutPct = penetration * 100

  return (
    <div className="rounded-xl border border-felt-line bg-felt-deep/50 p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-chalk-dim">
        <span>
          Shoe{' '}
          <span className="font-mono text-chalk">
            {dealt}/{shoeSize}
          </span>{' '}
          cards dealt
        </span>
        <span>
          Hands played{' '}
          <span className="font-mono text-chalk">{roundsPlayed}</span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-felt-line">
        <div
          className="h-full bg-brass transition-[width] duration-300"
          style={{ width: `${dealtPct}%` }}
        />
        {/* Cut-card marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-act-surrender"
          style={{ left: `${cutPct}%` }}
          title="Cut card — reshuffle point"
        />
      </div>
      <p className="mt-1 text-[0.7rem] text-chalk-dim/60">
        Reshuffle at the red cut card ({Math.round(cutPct)}% penetration).
      </p>
    </div>
  )
}

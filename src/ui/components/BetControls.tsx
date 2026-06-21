import { useState } from 'react'

interface BetControlsProps {
  bet: number
  bankroll: number
  min: number
  step: number
  onChange: (bet: number) => void
}

/**
 * Bet sizing: −/+ step buttons plus a custom amount field. The bet is always
 * clamped to [min, bankroll].
 */
export function BetControls({
  bet,
  bankroll,
  min,
  step,
  onChange,
}: BetControlsProps) {
  const [draft, setDraft] = useState('')
  const max = Math.max(min, bankroll)
  const clamp = (n: number) => Math.max(min, Math.min(max, n))

  const commitDraft = () => {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed > 0) onChange(clamp(parsed))
    setDraft('')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Decrease bet by ${step}`}
        disabled={bet <= min}
        onClick={() => onChange(clamp(bet - step))}
        className="h-9 w-9 rounded-full bg-felt-raised text-lg font-bold text-chalk hover:brightness-110 disabled:opacity-40"
      >
        −
      </button>

      <span className="min-w-20 text-center font-mono text-xl font-bold tabular-nums text-brass">
        ${bet}
      </span>

      <button
        type="button"
        aria-label={`Increase bet by ${step}`}
        disabled={bet + step > max}
        onClick={() => onChange(clamp(bet + step))}
        className="h-9 w-9 rounded-full bg-felt-raised text-lg font-bold text-chalk hover:brightness-110 disabled:opacity-40"
      >
        +
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        placeholder="custom"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
        className="w-24 rounded-md border border-felt-line bg-felt-deep px-2 py-1 font-mono text-sm text-chalk placeholder:text-chalk-dim/50"
      />
    </div>
  )
}

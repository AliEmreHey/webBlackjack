import { type BetLevel, BETTING_PRESETS } from '../../data/bettingStrategy'
import { densify } from './ramp'

const tcLabel = (tc: number, i: number, len: number) => {
  if (i === 0) return `≤ ${tc}`
  if (i === len - 1) return `≥ +${tc}`
  return tc > 0 ? `+${tc}` : `${tc}`
}

interface RampEditorProps {
  levels: BetLevel[]
  onChange: (levels: BetLevel[]) => void
}

export function RampEditor({ levels, onChange }: RampEditorProps) {
  const setBet = (trueCount: number, bet: number) => {
    onChange(
      levels.map((l) => (l.trueCount === trueCount ? { ...l, bet } : l)),
    )
  }

  return (
    <div className="rounded-xl border border-felt-line bg-felt-panel/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-teal-soft">
          Bet ramp
        </h2>
        <label className="flex items-center gap-2 text-xs text-chalk-dim">
          Preset
          <select
            aria-label="Load preset"
            defaultValue=""
            onChange={(e) => {
              const preset = BETTING_PRESETS.find((p) => p.name === e.target.value)
              if (preset) onChange(densify(preset))
              e.target.value = ''
            }}
            className="rounded-md border border-felt-line bg-felt-deep px-2 py-1 text-chalk"
          >
            <option value="" disabled>
              Load…
            </option>
            {BETTING_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-2 text-xs text-chalk-dim/70">
        Euro bet at each true count. Bet more when the count is high (you have
        the edge), less when it's low.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-2">
        {levels.map((level, i) => (
          <label key={level.trueCount} className="flex flex-col gap-1">
            <span className="text-center font-mono text-xs text-chalk-dim">
              {tcLabel(level.trueCount, i, levels.length)}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={level.bet}
              aria-label={`Bet at true count ${level.trueCount}`}
              onChange={(e) =>
                setBet(level.trueCount, Math.max(0, Number(e.target.value) || 0))
              }
              className="w-full rounded-md border border-felt-line bg-felt-deep px-1.5 py-1 text-center font-mono text-sm text-brass"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

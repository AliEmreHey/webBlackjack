import type { CountState } from '../../engine/count'

interface CountDisplayProps {
  count: CountState
  shown: boolean
  onToggle: () => void
}

/**
 * Running/true count panel with the core training toggle: hide the count to
 * practice keeping it yourself, reveal it to check.
 */
export function CountDisplay({ count, shown, onToggle }: CountDisplayProps) {
  return (
    <div className="rounded-xl border border-felt-line bg-felt-deep/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-teal-soft">
          Count
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md bg-felt-raised px-2.5 py-1 text-xs font-medium text-chalk hover:brightness-110"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {shown ? (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Running" value={fmt(count.running)} />
          <Stat label="True" value={fmt(round1(count.true))} />
          <Stat label="Decks left" value={round1(count.decksRemaining).toString()} />
        </dl>
      ) : (
        <p className="text-center text-sm text-chalk-dim/70">
          Hidden — keep it yourself
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-wide text-chalk-dim/70">
        {label}
      </dt>
      <dd className="font-mono text-2xl font-semibold text-chalk tabular-nums">
        {value}
      </dd>
    </div>
  )
}

const round1 = (n: number) => Math.round(n * 10) / 10
const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`)

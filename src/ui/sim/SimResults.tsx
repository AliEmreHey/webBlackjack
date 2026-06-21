import type { SimSummary } from '../../engine/simulator'
import { TrajectoryChart } from './TrajectoryChart'

const euro = (n: number) => {
  const r = Math.round(n)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}€${Math.abs(r).toLocaleString()}`
}
const euroAbs = (n: number) => `€${Math.abs(Math.round(n)).toLocaleString()}`

export function SimResults({ summary }: { summary: SimSummary }) {
  const hours = Math.round(summary.handsPerRun / summary.handsPerHour)
  const up = summary.expectedTotal >= 0
  const hourLo = summary.evPerHour - summary.sdPerHour
  const hourHi = summary.evPerHour + summary.sdPerHour
  const ruinPct = summary.riskOfRuin * 100

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-felt-line bg-felt-panel/50 p-4">
      {/* Headline */}
      <div>
        <p className="text-xs uppercase tracking-widest text-chalk-dim">
          Expected result · ~{hours} hours of play
        </p>
        <p
          className={`font-mono text-4xl font-bold tabular-nums ${
            up ? 'text-act-hit' : 'text-act-surrender'
          }`}
        >
          {euro(summary.expectedTotal)}
        </p>
      </div>

      {/* Per hour + swing band */}
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Per hour (~100 hands)" value={`${euro(summary.evPerHour)}`}>
          a typical hour lands between{' '}
          <span className="text-chalk">{euro(hourLo)}</span> and{' '}
          <span className="text-chalk">{euro(hourHi)}</span>
        </Metric>
        <Metric
          label="Risk of ruin"
          value={`${ruinPct.toFixed(1)}%`}
          danger={ruinPct >= 20}
        >
          chance of losing the whole {euroAbs(summary.startingBankroll)} bankroll
        </Metric>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-widest text-chalk-dim">
          One simulated run
        </p>
        <TrajectoryChart
          trajectory={summary.trajectory}
          startingBankroll={summary.startingBankroll}
        />
      </div>

      <p className="text-xs text-chalk-dim/60">
        {summary.trials.toLocaleString()} runs ·{' '}
        {summary.totalHands.toLocaleString()} hands simulated
      </p>
    </div>
  )
}

function Metric({
  label,
  value,
  danger,
  children,
}: {
  label: string
  value: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-felt-deep/50 p-3">
      <p className="text-xs uppercase tracking-wide text-chalk-dim">{label}</p>
      <p
        className={`font-mono text-2xl font-bold tabular-nums ${
          danger ? 'text-act-surrender' : 'text-chalk'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-chalk-dim/70">{children}</p>
    </div>
  )
}

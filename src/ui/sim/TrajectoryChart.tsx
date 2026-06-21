/**
 * Minimal dependency-free bankroll chart: one representative run's bankroll
 * over time, with a dashed line at the starting bankroll for reference.
 */
interface TrajectoryChartProps {
  trajectory: number[]
  startingBankroll: number
}

const W = 520
const H = 140
const PAD = 4

export function TrajectoryChart({
  trajectory,
  startingBankroll,
}: TrajectoryChartProps) {
  if (trajectory.length < 2) return null

  const min = Math.min(...trajectory, startingBankroll)
  const max = Math.max(...trajectory, startingBankroll)
  const range = max - min || 1

  const x = (i: number) =>
    PAD + (i / (trajectory.length - 1)) * (W - 2 * PAD)
  const y = (v: number) => PAD + (1 - (v - min) / range) * (H - 2 * PAD)

  const points = trajectory.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const startY = y(startingBankroll)
  const ended = trajectory[trajectory.length - 1]!
  const up = ended >= startingBankroll

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-36 w-full"
      role="img"
      aria-label="Bankroll over time for one simulated run"
    >
      <line
        x1={PAD}
        x2={W - PAD}
        y1={startY}
        y2={startY}
        stroke="currentColor"
        strokeDasharray="4 4"
        className="text-chalk-dim/40"
      />
      <polyline
        fill="none"
        strokeWidth={2}
        points={points}
        className={up ? 'text-act-hit' : 'text-act-surrender'}
        stroke="currentColor"
      />
    </svg>
  )
}

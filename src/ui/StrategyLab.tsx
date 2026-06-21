import { useState } from 'react'
import { GENTLE_RAMP } from '../data/bettingStrategy'
import type { BetLevel } from '../data/bettingStrategy'
import { PLAYING_STYLES, type PlayingStyle } from '../engine/playingStyle'
import {
  createWorkerRunner,
  useSimulation,
  type SimRunner,
} from './sim/useSimulation'
import { RampEditor } from './sim/RampEditor'
import { densify } from './sim/ramp'
import { SimResults } from './sim/SimResults'
import type { CustomStrategy } from '../engine/strategyOverrides'
import { DEFAULT_RULES } from '../engine/rules'

const TOTAL_CARDS = DEFAULT_RULES.decks * 52

const defaultRunner = createWorkerRunner()

// Runs = independent sessions; more runs → steadier risk-of-ruin estimate.
// Hands per run is set separately. Bigger totals are slower (run in a worker).
const RUN_PRESETS = [
  { id: 'quick', label: 'Quick', trials: 100 },
  { id: 'standard', label: 'Standard', trials: 300 },
  { id: 'thorough', label: 'Thorough', trials: 1000 },
  { id: 'exhaustive', label: 'Exhaustive', trials: 2500 },
] as const
type SimSizeId = (typeof RUN_PRESETS)[number]['id']

const DEFAULT_HANDS_PER_RUN = 10000
const MAX_HANDS_PER_RUN = 200000

interface StrategyLabProps {
  runner?: SimRunner
  custom?: CustomStrategy
}

export function StrategyLab({ runner = defaultRunner, custom }: StrategyLabProps) {
  const [levels, setLevels] = useState<BetLevel[]>(() => densify(GENTLE_RAMP))
  const [bankroll, setBankroll] = useState(2000)
  const [sizeId, setSizeId] = useState<SimSizeId>('standard')
  const [handsPerRun, setHandsPerRun] = useState(DEFAULT_HANDS_PER_RUN)
  const [style, setStyle] = useState<PlayingStyle>('optimal')
  const [showStyleInfo, setShowStyleInfo] = useState(false)
  // Cards left behind the cut card before reshuffle (the deeper, the more
  // high-count hands a counter sees). 52 ≈ one deck cut off.
  const [cardsLeft, setCardsLeft] = useState(52)
  const [shuffleEachRound, setShuffleEachRound] = useState(false)
  const { status, result, run } = useSimulation(runner)

  const styleBlurb = PLAYING_STYLES.find((s) => s.id === style)?.blurb
  const size = RUN_PRESETS.find((s) => s.id === sizeId)!
  const totalHands = size.trials * handsPerRun
  const penetration = (TOTAL_CARDS - cardsLeft) / TOTAL_CARDS

  const start = () => {
    run({
      strategy: { name: 'Custom', levels },
      rules: { ...DEFAULT_RULES, penetration },
      startingBankroll: bankroll,
      handsPerHour: 100,
      playingStyle: style,
      custom,
      shuffleEachRound,
      trials: size.trials,
      handsPerRun,
      // Fresh seed each run → a new random sample of shoes, so repeated runs
      // show the natural run-to-run variation (the engine stays seedable for tests).
      seed: `run-${Date.now()}`,
    })
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-brass">
          Strategy&nbsp;Lab
        </h1>
        <p className="mt-1 text-sm text-chalk-dim">
          Design a bet ramp, then simulate thousands of hands to see what it
          earns — and how often it goes broke. No single answer; find what fits
          your bankroll.
        </p>
      </header>

      <RampEditor levels={levels} onChange={setLevels} />

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-felt-line bg-felt-panel/50 p-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-chalk-dim">
            Bankroll (€)
          </span>
          <input
            type="number"
            min={0}
            step={100}
            value={bankroll}
            onChange={(e) => setBankroll(Math.max(0, Number(e.target.value) || 0))}
            className="w-32 rounded-md border border-felt-line bg-felt-deep px-2 py-1 font-mono text-chalk"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-chalk-dim">
            Cut card (cards left)
          </span>
          <input
            type="number"
            min={13}
            max={TOTAL_CARDS - 13}
            step={1}
            value={cardsLeft}
            disabled={shuffleEachRound}
            onChange={(e) =>
              setCardsLeft(
                Math.min(
                  TOTAL_CARDS - 13,
                  Math.max(13, Number(e.target.value) || 13),
                ),
              )
            }
            className="w-24 rounded-md border border-felt-line bg-felt-deep px-2 py-1 font-mono text-chalk disabled:opacity-40"
          />
          <span className="font-mono text-[0.7rem] text-chalk-dim/70">
            {shuffleEachRound ? 'n/a' : `~${Math.round(penetration * 100)}% penetration`}
          </span>
        </label>

        <div className="relative flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-chalk-dim">
            Playing style
            {style !== 'custom' && (
              <button
                type="button"
                aria-label="About playing styles"
                onClick={() => setShowStyleInfo((s) => !s)}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-chalk-dim/50 text-[0.65rem] font-bold lowercase text-chalk-dim hover:border-chalk hover:text-chalk"
              >
                i
              </button>
            )}
          </span>
          <select
            aria-label="Playing style"
            value={style}
            onChange={(e) => setStyle(e.target.value as PlayingStyle)}
            className="rounded-md border border-felt-line bg-felt-deep px-2 py-1 text-chalk"
          >
            {PLAYING_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {showStyleInfo && style !== 'custom' && (
            <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-felt-line bg-felt-raised p-2 text-xs leading-relaxed text-chalk shadow-xl shadow-black/40">
              You can build your own strategy on the{' '}
              <span className="font-semibold text-brass">My Strategy</span> tab,
              then pick it here.
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-chalk-dim">
            Hands per run
          </span>
          <input
            type="number"
            min={100}
            max={MAX_HANDS_PER_RUN}
            step={1000}
            value={handsPerRun}
            onChange={(e) =>
              setHandsPerRun(
                Math.min(
                  MAX_HANDS_PER_RUN,
                  Math.max(100, Number(e.target.value) || 100),
                ),
              )
            }
            className="w-28 rounded-md border border-felt-line bg-felt-deep px-2 py-1 font-mono text-chalk"
          />
          <span className="font-mono text-[0.7rem] text-chalk-dim/70">
            ~{Math.round(handsPerRun / 100)} hrs/run
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-chalk-dim">
            Runs (accuracy)
          </span>
          <select
            value={sizeId}
            onChange={(e) => setSizeId(e.target.value as SimSizeId)}
            className="rounded-md border border-felt-line bg-felt-deep px-2 py-1 text-chalk"
          >
            {RUN_PRESETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.trials} runs
              </option>
            ))}
          </select>
          <span className="font-mono text-[0.7rem] text-chalk-dim/70">
            ≈ {totalHands.toLocaleString()} hands total
          </span>
        </label>

        <button
          type="button"
          onClick={start}
          disabled={status === 'running'}
          className="ml-auto rounded-lg bg-brass px-5 py-2.5 font-bold uppercase tracking-wide text-felt-deep shadow-md shadow-black/30 transition hover:bg-brass-bright active:scale-[0.99] disabled:opacity-50"
        >
          {status === 'running' ? 'Simulating…' : 'Run simulation'}
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm text-chalk">
        <input
          type="checkbox"
          checked={shuffleEachRound}
          onChange={(e) => setShuffleEachRound(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brass"
        />
        <span>
          Shuffle every hand (CSM)
          <span className="mt-0.5 block text-xs text-chalk-dim/70">
            Models a continuous shuffling machine: the count resets every hand,
            so counting can’t build an edge — your bet ramp won’t help. A good
            way to see exactly how much the count is worth (compare it on/off).
          </span>
        </span>
      </label>

      {styleBlurb && (
        <p className="-mt-2 text-xs text-chalk-dim/70">
          <span className="font-semibold text-chalk-dim">Playing style:</span>{' '}
          {styleBlurb}
        </p>
      )}

      {status === 'running' && (
        <p className="animate-pulse text-center text-sm text-brass">
          Dealing thousands of hands…
        </p>
      )}

      {result && status !== 'running' && <SimResults summary={result} />}

      {status === 'idle' && !result && (
        <p className="py-6 text-center text-chalk-dim/60">
          Set your ramp and bankroll, then run a simulation.
        </p>
      )}
    </div>
  )
}

import { useState } from 'react'
import {
  type StrategyCode,
  DEALER_UPCARDS,
  HARD_STRATEGY,
  SOFT_STRATEGY,
  PAIR_STRATEGY,
} from '../data/basicStrategy'
import { ILLUSTRIOUS_18, FAB_4, type Deviation } from '../data/deviations'
import {
  cellKey,
  type CustomStrategy,
  EMPTY_CUSTOM,
  type HandType,
  type Regime,
} from '../engine/strategyOverrides'

const CODE_INFO: Record<StrategyCode, { text: string; cls: string }> = {
  H: { text: 'H', cls: 'bg-act-hit text-chalk' },
  S: { text: 'S', cls: 'bg-act-stand text-chalk' },
  D: { text: 'D', cls: 'bg-brass text-felt-deep' },
  Ds: { text: 'Ds', cls: 'bg-brass text-felt-deep' },
  P: { text: 'P', cls: 'bg-act-split text-chalk' },
  Rh: { text: 'R', cls: 'bg-act-surrender text-chalk' },
}

const LEGEND: { code: StrategyCode; label: string }[] = [
  { code: 'H', label: 'Hit' },
  { code: 'S', label: 'Stand' },
  { code: 'D', label: 'Double / else hit' },
  { code: 'Ds', label: 'Double / else stand' },
  { code: 'P', label: 'Split' },
  { code: 'Rh', label: 'Surrender / else hit' },
]

const codesFor = (handType: HandType): StrategyCode[] =>
  handType === 'pair' ? ['P', 'H', 'S', 'D'] : ['H', 'S', 'D', 'Rh']

const upcardLabel = (v: number) => (v === 11 ? 'A' : `${v}`)

interface Row {
  label: string
  value: number
  codes: readonly StrategyCode[]
}

const hardRows: Row[] = Object.keys(HARD_STRATEGY)
  .map(Number)
  .sort((a, b) => a - b)
  .map((total) => ({ label: `${total}`, value: total, codes: HARD_STRATEGY[total]! }))

const softRows: Row[] = Object.keys(SOFT_STRATEGY)
  .map(Number)
  .sort((a, b) => a - b)
  .map((total) => ({
    label: `A,${total - 11}`,
    value: total,
    codes: SOFT_STRATEGY[total]!,
  }))

const pairLabel = (v: number) =>
  v === 11 ? 'A,A' : v === 10 ? '10,10' : `${v},${v}`
const pairRows: Row[] = Object.keys(PAIR_STRATEGY)
  .map(Number)
  .sort((a, b) => a - b)
  .map((v) => ({ label: pairLabel(v), value: v, codes: PAIR_STRATEGY[v]! }))

interface EditTarget {
  key: string
  handType: HandType
  label: string
  x: number
  y: number
}

interface ChartTableProps {
  title: string
  handType: HandType
  rows: Row[]
  /** Code explicitly set in the active regime, by cell key. */
  active: Record<string, StrategyCode>
  /** Fallback code shown (dimmed) when a cell isn't set in the active regime. */
  inherited: (handType: HandType, value: number, upcard: number, baseCode: StrategyCode) => StrategyCode
  onCell?: (target: EditTarget) => void
}

function ChartTable({
  title,
  handType,
  rows,
  active,
  inherited,
  onCell,
}: ChartTableProps) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-soft">
        {title}
      </h3>
      <table className="w-full border-separate border-spacing-0.5 text-center font-mono text-xs">
        <thead>
          <tr>
            <th className="w-10 text-chalk-dim" />
            {DEALER_UPCARDS.map((v) => (
              <th key={v} className="text-chalk-dim">
                {upcardLabel(v)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="pr-1 text-right font-semibold text-chalk-dim">
                {row.label}
              </th>
              {row.codes.map((baseCode, i) => {
                const upcard = DEALER_UPCARDS[i]!
                const key = cellKey(handType, row.value, upcard)
                const explicit = active[key]
                const code = explicit ?? inherited(handType, row.value, upcard, baseCode)
                const dimmed = Boolean(onCell) && !explicit
                const cls = `flex h-6 w-full items-center justify-center rounded font-semibold ${CODE_INFO[code].cls} ${explicit ? 'ring-2 ring-brass-bright' : dimmed ? 'opacity-55' : ''}`
                const label = `${row.label} vs ${upcardLabel(upcard)}`
                const aria = `${label}: ${CODE_INFO[code].text}${explicit ? ' (set)' : ''}`
                return (
                  <td key={i}>
                    {onCell ? (
                      <button
                        type="button"
                        aria-label={aria}
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect()
                          onCell({ key, handType, label, x: r.left, y: r.bottom })
                        }}
                        className={`${cls} cursor-pointer transition hover:opacity-100 hover:brightness-125`}
                      >
                        {CODE_INFO[code].text}
                      </button>
                    ) : (
                      <span className={cls}>{CODE_INFO[code].text}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const triggerLabel = (d: Deviation) =>
  `TC ${d.direction === 'gte' ? '≥' : '≤'} ${d.index > 0 ? `+${d.index}` : d.index}`

function DeviationList({ title, items }: { title: string; items: readonly Deviation[] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-soft">
        {title}
      </h3>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {items.map((d) => (
          <li key={d.id} className="flex justify-between gap-2 text-chalk-dim">
            <span className="text-chalk">{d.label}</span>
            <span className="font-mono text-xs text-brass">{triggerLabel(d)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const REGIMES: { id: Regime; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'high', label: 'High count' },
  { id: 'low', label: 'Low count' },
]

interface StrategyChartProps {
  custom?: CustomStrategy
  onChange?: (custom: CustomStrategy) => void
}

export function StrategyChart({
  custom = EMPTY_CUSTOM,
  onChange,
}: StrategyChartProps) {
  const editable = Boolean(onChange)
  const [regime, setRegime] = useState<Regime>('base')
  const [edit, setEdit] = useState<EditTarget | null>(null)

  const activeMap = custom[regime]
  const setCount =
    Object.keys(custom.base).length +
    Object.keys(custom.high).length +
    Object.keys(custom.low).length

  // Fallback shown (dimmed) when a cell isn't set in the active regime:
  // high/low inherit your Base if set, otherwise the built-in basic play.
  const inherited = (
    handType: HandType,
    value: number,
    upcard: number,
    baseCode: StrategyCode,
  ): StrategyCode => {
    const key = cellKey(handType, value, upcard)
    if (regime !== 'base' && custom.base[key]) return custom.base[key]
    return baseCode
  }

  const setCell = (key: string, code: StrategyCode) =>
    onChange?.({ ...custom, [regime]: { ...activeMap, [key]: code } })
  const clearCell = (key: string) => {
    const next = { ...activeMap }
    delete next[key]
    onChange?.({ ...custom, [regime]: next })
  }

  const tables = (
    <div className="overflow-x-auto rounded-xl border border-felt-line bg-felt-panel/50 p-4">
      <p className="mb-3 text-xs text-chalk-dim/70">
        Rows = your hand, columns = dealer upcard.{' '}
        {editable
          ? 'Dimmed cells follow Optimal; tap one to set your own play for this case.'
          : 'Hard totals ≤7 always hit; 17+ always stand.'}
      </p>
      <div className="flex min-w-[34rem] flex-col gap-4">
        <ChartTable
          title="Hard totals"
          handType="hard"
          rows={hardRows}
          active={activeMap}
          inherited={inherited}
          onCell={editable ? setEdit : undefined}
        />
        <ChartTable
          title="Soft totals"
          handType="soft"
          rows={softRows}
          active={activeMap}
          inherited={inherited}
          onCell={editable ? setEdit : undefined}
        />
        <ChartTable
          title="Pairs"
          handType="pair"
          rows={pairRows}
          active={activeMap}
          inherited={inherited}
          onCell={editable ? setEdit : undefined}
        />
      </div>
    </div>
  )

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <header>
        <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-brass">
          {editable ? 'My Strategy' : 'Optimal Strategy'}
        </h1>
        <p className="mt-1 text-sm text-chalk-dim">
          {editable
            ? 'Three charts by count: your Base, plus what you’d do differently when the count is High or Low. Edit only the hands you’d change — the rest follows Optimal. Pick “My Strategy” in the Lab to simulate it.'
            : 'Textbook basic strategy plus the Hi-Lo count deviations. A reference, not a rule.'}
        </p>
      </header>

      {editable && (
        <div className="flex flex-col gap-3 rounded-xl border border-felt-line bg-felt-panel/50 p-3">
          <div className="flex items-center gap-1 rounded-full border border-felt-line bg-felt-deep/60 p-1">
            {REGIMES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegime(r.id)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  regime === r.id
                    ? 'bg-brass text-felt-deep'
                    : 'text-chalk-dim hover:text-chalk'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-chalk-dim">
            {regime === 'base' && (
              <span>Your everyday chart — used between the count thresholds.</span>
            )}
            {regime === 'high' && (
              <label className="flex items-center gap-2">
                Use this chart when true count ≥
                <input
                  type="number"
                  aria-label="High count threshold"
                  value={custom.highThreshold}
                  onChange={(e) =>
                    onChange?.({ ...custom, highThreshold: Number(e.target.value) })
                  }
                  className="w-12 rounded border border-felt-line bg-felt-deep px-1 py-0.5 text-center font-mono text-brass"
                />
              </label>
            )}
            {regime === 'low' && (
              <label className="flex items-center gap-2">
                Use this chart when true count ≤
                <input
                  type="number"
                  aria-label="Low count threshold"
                  value={custom.lowThreshold}
                  onChange={(e) =>
                    onChange?.({ ...custom, lowThreshold: Number(e.target.value) })
                  }
                  className="w-12 rounded border border-felt-line bg-felt-deep px-1 py-0.5 text-center font-mono text-brass"
                />
              </label>
            )}
            {setCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChange?.({ ...custom, base: {}, high: {}, low: {} })
                }
                className="rounded-md bg-felt-raised px-3 py-1 font-medium text-chalk hover:brightness-110"
              >
                Reset all ({setCount})
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-felt-line bg-felt-panel/50 p-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalk-dim">
          {LEGEND.map((l) => (
            <span key={l.code} className="flex items-center gap-1.5">
              <span
                className={`inline-flex h-4 w-5 items-center justify-center rounded font-mono text-[0.6rem] font-bold ${CODE_INFO[l.code].cls}`}
              >
                {CODE_INFO[l.code].text}
              </span>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {tables}

      <div className="flex flex-col gap-4 rounded-xl border border-felt-line bg-felt-panel/50 p-4">
        <p className="text-xs text-chalk-dim/70">
          Reference: the built-in count deviations (used by Optimal).
        </p>
        <DeviationList title="Illustrious 18" items={ILLUSTRIOUS_18} />
        <DeviationList title="Fab 4 (surrender)" items={FAB_4} />
      </div>

      {/* Edit menu */}
      {edit && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setEdit(null)}
            aria-hidden="true"
          />
          <div
            role="menu"
            aria-label={`Set play for ${edit.label}`}
            className="fixed z-20 w-44 rounded-lg border border-felt-line bg-felt-raised p-1 shadow-xl shadow-black/50"
            style={{
              left: Math.min(edit.x, window.innerWidth - 184),
              top: Math.min(edit.y + 4, window.innerHeight - 220),
            }}
          >
            <p className="px-2 py-1 font-mono text-xs text-chalk-dim">
              {edit.label} · {REGIMES.find((r) => r.id === regime)!.label}
            </p>
            {codesFor(edit.handType).map((code) => (
              <button
                key={code}
                type="button"
                role="menuitem"
                onClick={() => {
                  setCell(edit.key, code)
                  setEdit(null)
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-chalk hover:bg-felt-line"
              >
                <span
                  className={`inline-flex h-4 w-5 items-center justify-center rounded font-mono text-[0.6rem] font-bold ${CODE_INFO[code].cls}`}
                >
                  {CODE_INFO[code].text}
                </span>
                {code === 'Rh' ? 'Surrender' : code === 'Ds' ? 'Double/stand' : code === 'D' ? 'Double' : code === 'P' ? 'Split' : code === 'H' ? 'Hit' : 'Stand'}
              </button>
            ))}
            {activeMap[edit.key] && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  clearCell(edit.key)
                  setEdit(null)
                }}
                className="mt-1 w-full rounded px-2 py-1.5 text-left text-sm text-teal-soft hover:bg-felt-line"
              >
                Follow optimal
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

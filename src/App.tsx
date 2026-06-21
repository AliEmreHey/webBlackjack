import { useState } from 'react'
import { PlayMode } from './ui/PlayMode'
import { StrategyLab } from './ui/StrategyLab'
import { StrategyChart } from './ui/StrategyChart'
import { EMPTY_CUSTOM, type CustomStrategy } from './engine/strategyOverrides'

type Tab = 'play' | 'lab' | 'chart'

const TABS: { id: Tab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'lab', label: 'Strategy Lab' },
  { id: 'chart', label: 'My Strategy' },
]

function App() {
  const [tab, setTab] = useState<Tab>('play')
  // Custom strategy shared between the My Strategy chart (editor) and the
  // Strategy Lab (which simulates the "My Strategy" playing style).
  const [custom, setCustom] = useState<CustomStrategy>(EMPTY_CUSTOM)

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6">
      <nav className="mb-6 flex gap-1 rounded-full border border-felt-line bg-felt-panel/60 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-brass text-felt-deep'
                : 'text-chalk-dim hover:text-chalk'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'play' && <PlayMode />}
      {tab === 'lab' && <StrategyLab custom={custom} />}
      {tab === 'chart' && (
        <StrategyChart custom={custom} onChange={setCustom} />
      )}
    </main>
  )
}

export default App

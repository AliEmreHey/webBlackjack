import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { StrategyLab } from './StrategyLab'
import { runSimulation, type SimConfig } from '../engine/simulator'

afterEach(cleanup)

// Synchronous runner with a tiny config so tests are fast and deterministic
// (the real component uses a Web Worker, which jsdom can't run).
const syncRunner = (config: SimConfig) =>
  Promise.resolve(runSimulation({ ...config, trials: 10, handsPerRun: 200 }))

describe('StrategyLab', () => {
  it('renders the ramp editor with a euro input per level', () => {
    render(<StrategyLab runner={syncRunner} />)
    expect(
      screen.getByRole('heading', { name: /bet ramp/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/bet at true count 2/i)).toBeInTheDocument()
  })

  it('runs a simulation and shows the euro result + risk of ruin', async () => {
    render(<StrategyLab runner={syncRunner} />)
    fireEvent.click(screen.getByRole('button', { name: /run simulation/i }))

    await waitFor(() =>
      expect(screen.getByText(/expected result/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/risk of ruin/i)).toBeInTheDocument()
    // Euro figures render (headline, per-hour, band…).
    expect(screen.getAllByText(/€/).length).toBeGreaterThan(0)
  })

  it('lets you edit a bet level', () => {
    render(<StrategyLab runner={syncRunner} />)
    const input = screen.getByLabelText(/bet at true count 5/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '99' } })
    expect(input.value).toBe('99')
  })
})

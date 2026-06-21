import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { StrategyChart } from './StrategyChart'
import {
  cellKey,
  EMPTY_CUSTOM,
  type CustomStrategy,
} from '../engine/strategyOverrides'

afterEach(cleanup)

/** Controlled wrapper so edits persist across renders in tests. */
function EditableChart({
  onChange,
}: {
  onChange?: (c: CustomStrategy) => void
}) {
  const [custom, setCustom] = useState<CustomStrategy>(EMPTY_CUSTOM)
  return (
    <StrategyChart
      custom={custom}
      onChange={(c) => {
        setCustom(c)
        onChange?.(c)
      }}
    />
  )
}

describe('StrategyChart', () => {
  it('renders the three chart sections and the deviation lists', () => {
    render(<StrategyChart />)
    expect(
      screen.getByRole('heading', { name: /hard totals/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /soft totals/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^pairs$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /illustrious 18/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /fab 4/i })).toBeInTheDocument()
  })

  it('shows a known deviation with its index', () => {
    render(<StrategyChart />)
    // 16 vs 10 → Stand at TC ≥ 0 is the most famous I18 play.
    expect(screen.getByText(/16 vs 10 → Stand/i)).toBeInTheDocument()
  })

  it('renders a legend explaining the codes', () => {
    render(<StrategyChart />)
    const legendDouble = screen.getByText(/double \/ else stand/i)
    expect(legendDouble).toBeInTheDocument()
    expect(within(document.body).getByText('Surrender / else hit')).toBeTruthy()
  })

  it('is read-only with no onChange (cells are not buttons)', () => {
    render(<StrategyChart />)
    expect(
      screen.queryByRole('button', { name: /16 vs 10/i }),
    ).not.toBeInTheDocument()
  })

  it('sets a play in the Base regime via the cell menu', () => {
    const onChange = vi.fn()
    render(<EditableChart onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /16 vs 10/i }))
    const menu = screen.getByRole('menu', { name: /set play for 16 vs 10/i })
    fireEvent.click(within(menu).getByRole('menuitem', { name: /stand/i }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ base: { [cellKey('hard', 16, 10)]: 'S' } }),
    )
    // The cell is now marked as set and a Reset control appears.
    expect(
      screen.getByRole('button', { name: /16 vs 10.*set/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument()
  })

  it('edits the High-count chart on its own tab', () => {
    const onChange = vi.fn()
    render(<EditableChart onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /high count/i }))
    fireEvent.click(screen.getByRole('button', { name: /16 vs 10/i }))
    const menu = screen.getByRole('menu', { name: /set play for 16 vs 10/i })
    fireEvent.click(within(menu).getByRole('menuitem', { name: /hit/i }))

    // The edit lands in the `high` regime, not `base`.
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ high: { [cellKey('hard', 16, 10)]: 'H' } }),
    )
  })

  it('exposes the High threshold control', () => {
    render(<EditableChart />)
    fireEvent.click(screen.getByRole('button', { name: /high count/i }))
    expect(screen.getByLabelText(/high count threshold/i)).toBeInTheDocument()
  })
})

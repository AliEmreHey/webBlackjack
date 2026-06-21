import { describe, it, expect, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'
import { PlayMode } from './PlayMode'
import { StackedDeck, c } from '../test/stackedDeck'

afterEach(cleanup)

describe('PlayMode', () => {
  it('renders the betting prompt before any deal', () => {
    render(<PlayMode />)
    expect(screen.getByText(/place a bet and deal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^deal$/i })).toBeInTheDocument()
    expect(screen.getByText('$1000')).toBeInTheDocument()
  })

  it('deals a round when Deal is clicked', () => {
    render(<PlayMode />)
    fireEvent.click(screen.getByRole('button', { name: /^deal$/i }))
    // The dealer hand is now on the table.
    expect(screen.getByText(/dealer/i)).toBeInTheDocument()
    // Either the player can act, must decide insurance, or the round settled.
    const actionButtons = screen.queryAllByRole('button', {
      name: /hit|stand|double|split|surrender|insurance|decline|next hand/i,
    })
    expect(actionButtons.length).toBeGreaterThan(0)
  })

  it('toggles the count display', () => {
    render(<PlayMode />)
    // Hidden by default.
    expect(screen.getByText(/keep it yourself/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^show$/i }))
    // Revealed: the Running/True/Decks labels show.
    expect(screen.getByText(/running/i)).toBeInTheDocument()
    expect(screen.getByText(/true/i)).toBeInTheDocument()
  })

  it('offers Reset bankroll when out of chips, not Deal', () => {
    render(<PlayMode config={{ startingBankroll: 3 }} />)
    expect(
      screen.getByRole('button', { name: /reset bankroll/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^deal$/i }),
    ).not.toBeInTheDocument()
  })

  it('disables Take insurance when it is unaffordable', () => {
    // Bet 10 of a 12 bankroll → 2 left, insurance costs 5.
    const config = {
      cardSource: new StackedDeck([c('10'), c('A'), c('10'), c('9')]),
      startingBankroll: 12,
    }
    render(<PlayMode config={config} />)
    fireEvent.click(screen.getByRole('button', { name: /^deal$/i }))
    expect(screen.getByRole('button', { name: /take insurance/i })).toBeDisabled()
    expect(screen.getByText(/not enough bankroll/i)).toBeInTheDocument()
  })

  it('plays the dealer out one card at a time after the player stands', async () => {
    // player 10,7=17; dealer up 6, hole 10 (16) draws 8 → 24 bust → player wins
    const config = {
      cardSource: new StackedDeck([c('10'), c('6'), c('7'), c('10'), c('8')]),
      manualDealer: true,
      startingBankroll: 1000,
    }
    render(<PlayMode config={config} dealerStepMs={5} />)
    fireEvent.click(screen.getByRole('button', { name: /^deal$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^stand$/i }))

    // Dealer is now playing; the round is not settled instantly.
    expect(screen.getByText(/dealer playing/i)).toBeInTheDocument()

    // The timed reveal/draw steps run to completion and the round settles.
    await waitFor(() =>
      expect(screen.getByText(/^win$/i)).toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', { name: /next hand/i }),
    ).toBeInTheDocument()
  })
})

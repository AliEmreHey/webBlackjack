import { useReducer, useState } from 'react'
import { Game, type GameConfig } from '../../engine/game'
import type { Action } from '../../engine/types'

/**
 * Bridges the mutable {@link Game} engine to React. The Game instance is held
 * in state (created once, stable across renders); a version counter forces a
 * re-render after any mutation so components read fresh state from it.
 */
export function useGame(config: GameConfig = {}) {
  const [game] = useState(() => new Game(config))
  const [, bump] = useReducer((n: number) => n + 1, 0)

  const act = (fn: () => void) => {
    fn()
    bump()
  }

  return {
    game,
    round: game.round,
    bankroll: game.bankroll,
    count: game.count,
    runningCount: game.runningCount,
    cardsRemaining: game.cardsRemaining,
    shoeSize: game.shoeSize,
    roundsPlayed: game.roundsPlayed,
    needsReshuffle: game.needsReshuffle,
    availableActions: game.availableActions(),
    startRound: (bet: number) => act(() => game.startRound(bet)),
    takeInsurance: (take: boolean) => act(() => game.takeInsurance(take)),
    reshuffle: () => act(() => game.reshuffle()),
    resetBankroll: () => act(() => game.resetBankroll()),
    advanceDealer: () => act(() => game.advanceDealer()),
    perform: (action: Action) => act(() => game.perform(action)),
  }
}

export type UseGame = ReturnType<typeof useGame>

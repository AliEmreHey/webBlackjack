import { useCallback, useRef, useState } from 'react'
import type { SimConfig, SimSummary } from '../../engine/simulator'

/** Runs a simulation config and resolves with its summary. */
export type SimRunner = (config: SimConfig) => Promise<SimSummary>

/** Default runner: spins up the Web Worker, resolves, then tears it down. */
export function createWorkerRunner(): SimRunner {
  return (config) =>
    new Promise<SimSummary>((resolve, reject) => {
      const worker = new Worker(new URL('./simWorker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = (e: MessageEvent<SimSummary>) => {
        resolve(e.data)
        worker.terminate()
      }
      worker.onerror = (e) => {
        reject(new Error(e.message))
        worker.terminate()
      }
      worker.postMessage(config)
    })
}

export type SimStatus = 'idle' | 'running' | 'done'

/**
 * Drives a simulation run: exposes status + the latest result and a `run`
 * callback. The runner is injectable so tests can supply a synchronous one.
 */
export function useSimulation(runner: SimRunner) {
  const [status, setStatus] = useState<SimStatus>('idle')
  const [result, setResult] = useState<SimSummary | null>(null)
  // Guard against an earlier run resolving after a later one.
  const runIdRef = useRef(0)

  const run = useCallback(
    async (config: SimConfig) => {
      const id = ++runIdRef.current
      setStatus('running')
      try {
        const summary = await runner(config)
        if (id !== runIdRef.current) return
        setResult(summary)
        setStatus('done')
      } catch {
        if (id !== runIdRef.current) return
        setStatus('idle')
      }
    },
    [runner],
  )

  return { status, result, run }
}

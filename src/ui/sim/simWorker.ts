/// <reference lib="webworker" />
/**
 * Web Worker: runs the Monte Carlo simulation off the main thread so the UI
 * stays responsive during the (CPU-heavy) run. The simulator itself is pure;
 * this is just a thin message bridge.
 */
import { runSimulation, type SimConfig, type SimSummary } from '../../engine/simulator'

self.onmessage = (event: MessageEvent<SimConfig>) => {
  const summary: SimSummary = runSimulation(event.data)
  ;(self as DedicatedWorkerGlobalScope).postMessage(summary)
}

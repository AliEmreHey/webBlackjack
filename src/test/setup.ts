// Vitest global setup. Extends `expect` with jest-dom matchers for the
// component tests added in the UI phase. Engine tests don't need the DOM,
// but a single shared setup keeps the config simple.
import '@testing-library/jest-dom/vitest'

# ♠ Blackjack Card-Counting Trainer

A fast, 100% client-side web app for practising **Hi-Lo card counting** and
discovering your own optimal strategy. Play realistic hands with a hide/show
count, then use the **Strategy Lab** to design a bet ramp and playing style and
simulate tens of thousands of hands to see the expected euro result, the swing
band, and your risk of ruin.

It's a **training tool, not gambling** — no real money, no accounts, no server,
no tracking. Everything runs in your browser.

## Features

- **Play** — deal hands and hit / stand / double / split / surrender, with a
  toggleable running & true count, a shoe-penetration meter, insurance, and
  card-by-card dealer play.
- **Strategy Lab** — build a count → bet ramp (in euros), pick a playing style,
  set bankroll, penetration, hands per run, and CSM on/off, then run a Monte
  Carlo simulation (off the main thread in a Web Worker). Results: expected
  €/hour, the typical swing band, and **risk of ruin**.
- **My Strategy** — edit your own strategy chart per **count regime**
  (Base / High / Low) and simulate it head-to-head against Optimal.

The app is deliberately **non-prescriptive**: it shows the recommended plays as
a reference, but the point is to let you build and *measure* your own strategy.

## Correctness

All counting math, the 6-deck S17 basic-strategy chart, the Illustrious 18, and
the Fab 4 are verified against authoritative published sources. The
game/strategy/simulation **engine** (`src/engine`) is pure, framework-agnostic
TypeScript with **no UI dependencies** and is covered by an extensive
unit-test suite.

## Tech stack

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · Vitest · Web Workers.
Zero runtime dependencies beyond React.

## Run locally

Requires Node **20.19+** or **22.12+**.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build locally
npm test           # run all unit tests
npm run typecheck  # strict TypeScript check
npm run lint       # ESLint
```

## Project structure

```
src/
  engine/   Pure TS: cards, shoe, hand eval, Hi-Lo count, strategy,
            deviations, round flow, and the Monte Carlo simulator (+ tests)
  data/     Lookup tables as data: counting systems, basic strategy,
            Illustrious 18 / Fab 4, betting presets
  ui/       React: Play / Strategy Lab / My Strategy, components, hooks,
            and the simulation Web Worker
```

## Deploy to GitHub Pages

The build uses a **relative base**, so it works at any path
(`username.github.io/<repo>/`) with no configuration.

The workflow at [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
builds and deploys automatically:

1. Push this project to a GitHub repo (default branch `main` or `master`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
3. Push to the default branch (or run the workflow from the **Actions** tab).
   The site publishes to `https://<username>.github.io/<repo>/`.

To host it under your personal site, either keep it as its own repo (it lives
at `…github.io/<repo>/`) or copy the built `dist/` into a subfolder of your
`username.github.io` repo — the relative base makes both work.

### Other static hosts

`npm run build` outputs a plain static site in `dist/`. On Netlify or Vercel,
set the build command to `npm run build` and the publish directory to `dist`.

## Disclaimer

For education and practice only. This software does not facilitate real-money
gambling and makes no guarantee of winnings. Card counting may be restricted by
some casinos; use responsibly.

## License

[MIT](./LICENSE) © 2026 AliEmreHey

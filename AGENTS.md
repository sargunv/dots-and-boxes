# Dots and Boxes

A Dots and Boxes SPA.

## Project map

- `src/routes/` — TanStack Router file-based routes
- `src/components/` — feature UI
- `src/ui/` — reusable primitives
- `src/lib/` — queries, mutations, and hooks
- `src/lib/game.ts` — pure game engine (state, moves, scoring)
- `src/lib/topology.ts` — board topologies (square / triangular / hexagonal
  grids, American / Swedish / Icelandic start styles) as vertex-edge-cell graphs
  built from cell polygons
- `src/lib/ai.ts` — minimax AI (iterative deepening, alpha-beta, 3s budget), run
  in a Web Worker via `ai-client.ts` / `ai.worker.ts` / `ai-protocol.ts`

## Dev tool commands

This project uses `mise` for tooling. Run `mise tasks ls --all` for the full
list.

- `mise run dev` — start the Vite dev server
- `mise run generate` — regenerate the TanStack Router route tree
- `mise run check` — lint and format checks
- `mise run fix` — auto-fix lint and format issues
- `mise run build` — production build
- `mise run test` — run tests

## Project invariants

<!-- List non-negotiable rules for this project -->

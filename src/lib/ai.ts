import { applyMove, cellEdgeCount, isGameOver, legalMoves } from "./game.ts";
import type { GameState } from "./game.ts";
import { at } from "./topology.ts";

export type Difficulty = "easy" | "medium" | "hard";

const MAX_DEPTH: Record<Difficulty, number> = {
  easy: 2,
  medium: 6,
  hard: 12,
};

/** Wall-clock budget per move; deeper search levels are abandoned past this. */
const TIME_BUDGET_MS = 3000;

/** How often (in searched nodes) the deadline is checked. */
const CLOCK_CHECK_INTERVAL = 1024;

/** Don't bother caching nodes this close to the leaves; they're cheap to redo. */
const MIN_STORE_DEPTH = 2;

/** Safety valve on transposition-table memory use. */
const MAX_TABLE_SIZE = 2_000_000;

class SearchAbortedError extends Error {}
const ABORT = new SearchAbortedError();

type Flag = "exact" | "lower" | "upper";

interface Entry {
  readonly depth: number;
  readonly value: number;
  readonly flag: Flag;
}

interface SearchContext {
  readonly deadline: number;
  nodes: number;
  readonly table: Map<bigint, Entry>;
}

/**
 * Pick the computer's move using minimax with alpha-beta pruning.
 *
 * The searched value is the number of future boxes the computer will claim
 * minus the number the human will claim, assuming both sides play optimally
 * from the given state. Because claiming a box grants another turn, the same
 * player may move several times in a row within the tree.
 *
 * The search uses iterative deepening: it re-searches at increasing depths up
 * to the difficulty's cap and keeps the best move from the deepest level that
 * completed within `TIME_BUDGET_MS`, so it always answers within roughly that
 * budget regardless of board size. A transposition table is shared across all
 * iterations and stores bound-flagged values (exact / lower / upper) keyed by
 * a bigint bitmask of the drawn edges plus the player to move.
 *
 * Returns `null` when there are no legal moves.
 */
export function chooseMove(
  state: GameState,
  difficulty: Difficulty,
): number | null {
  const moves = orderMoves(state, legalMoves(state));
  const first = moves[0];
  if (first === undefined) return null;

  const ctx: SearchContext = {
    deadline: performance.now() + TIME_BUDGET_MS,
    nodes: 0,
    table: new Map(),
  };

  let best = first;
  // Best moves from the previous iteration, searched first to prune earlier.
  let preferred: readonly number[] = [];
  for (let depth = 1; depth <= MAX_DEPTH[difficulty]; depth += 1) {
    try {
      const result = searchRoot(state, moves, preferred, depth, ctx);
      best = result.move;
      preferred = result.bestMoves;
    } catch (error) {
      if (!(error instanceof SearchAbortedError)) throw error;
      break;
    }
  }
  return best;
}

function searchRoot(
  state: GameState,
  moves: readonly number[],
  preferred: readonly number[],
  depth: number,
  ctx: SearchContext,
): { move: number; bestMoves: number[] } {
  const boost = new Set(preferred);
  const ordered = [...moves].sort(
    (a, b) => Number(boost.has(b)) - Number(boost.has(a)),
  );

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMoves: number[] = [];
  let alpha = Number.NEGATIVE_INFINITY;

  for (const move of ordered) {
    checkClock(ctx);
    const next = applyMove(state, move);
    const claimed = next.scores.computer - state.scores.computer;
    const score =
      claimed + search(next, depth - 1, alpha, Number.POSITIVE_INFINITY, ctx);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
    alpha = Math.max(alpha, bestScore);
  }

  const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  if (move === undefined) throw new Error("unreachable: no best move");
  return { move, bestMoves };
}

function search(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchContext,
): number {
  ctx.nodes += 1;
  if (ctx.nodes % CLOCK_CHECK_INTERVAL === 0) checkClock(ctx);
  if (depth === 0 || isGameOver(state)) return 0;

  // Probe the transposition table: reuse an exact value outright, or narrow
  // the alpha-beta window with a stored bound.
  const key = tableKey(state);
  const entry = ctx.table.get(key);
  if (entry !== undefined && entry.depth >= depth) {
    if (entry.flag === "exact") return entry.value;
    if (entry.flag === "lower") alpha = Math.max(alpha, entry.value);
    else beta = Math.min(beta, entry.value);
    if (alpha >= beta) return entry.value;
  }
  const alphaStart = alpha;
  const betaStart = beta;

  const maximizing = state.currentPlayer === "computer";
  let value = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const move of orderMoves(state, legalMoves(state))) {
    const next = applyMove(state, move);
    // Boxes claimed by this move belong to the player who just moved; the
    // searched value tracks computer boxes minus human boxes from here on.
    const claimed =
      next.scores[state.currentPlayer] - state.scores[state.currentPlayer];
    const child = search(next, depth - 1, alpha, beta, ctx);

    if (maximizing) {
      value = Math.max(value, claimed + child);
      alpha = Math.max(alpha, value);
    } else {
      value = Math.min(value, child - claimed);
      beta = Math.min(beta, value);
    }
    if (alpha >= beta) break;
  }

  const flag: Flag =
    value <= alphaStart ? "upper" : value >= betaStart ? "lower" : "exact";
  if (
    depth >= MIN_STORE_DEPTH &&
    ctx.table.size < MAX_TABLE_SIZE &&
    (entry === undefined || entry.depth <= depth)
  ) {
    ctx.table.set(key, { depth, value, flag });
  }
  return value;
}

function checkClock(ctx: SearchContext): void {
  if (performance.now() > ctx.deadline) throw ABORT;
}

/**
 * Order moves so alpha-beta prunes early: box-completing moves first, then
 * safe moves, then moves that hand the opponent a box.
 */
function orderMoves(state: GameState, moves: readonly number[]): number[] {
  return [...moves].sort(
    (a, b) => movePriority(state, b) - movePriority(state, a),
  );
}

function movePriority(state: GameState, move: number): number {
  let completes = 0;
  let givesAway = 0;
  for (const cell of at(state.topology.edgeCells, move)) {
    const sides = at(state.topology.cells, cell).length;
    const drawn = cellEdgeCount(state.topology, state.edges, cell);
    if (drawn === sides - 1) completes += 1;
    else if (drawn === sides - 2) givesAway += 1;
  }
  if (completes > 0) return 2 + completes;
  if (givesAway > 0) return 0;
  return 1;
}

/** Bitmask of drawn edges, with the player to move in the lowest bit. */
function tableKey(state: GameState): bigint {
  let key = state.currentPlayer === "computer" ? 1n : 0n;
  for (const drawn of state.edges) {
    key = (key << 1n) | (drawn ? 1n : 0n);
  }
  return key;
}

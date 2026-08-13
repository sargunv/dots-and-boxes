import { at } from "./topology.ts";
import type { Topology } from "./topology.ts";

export type Player = "human" | "computer";

export interface GameState {
  /** Board shape this game is played on. */
  readonly topology: Topology;
  /** Whether each edge has been drawn. */
  readonly edges: readonly boolean[];
  /** Who drew each edge (`null` if not drawn, or pre-drawn at game start). */
  readonly edgeOwners: ReadonlyArray<Player | null>;
  /** Owner of each claimed cell (`null` if unclaimed). */
  readonly cells: ReadonlyArray<Player | null>;
  /** Player to move. */
  readonly currentPlayer: Player;
  /** Cells claimed so far, per player. */
  readonly scores: Record<Player, number>;
}

export function createGame(
  topology: Topology,
  firstPlayer: Player = "human",
  preDrawn: readonly number[] = [],
): GameState {
  const edges = Array.from({ length: topology.edges.length }, () => false);
  for (const edge of preDrawn) edges[edge] = true;
  return {
    topology,
    edges,
    edgeOwners: Array.from({ length: topology.edges.length }, () => null),
    cells: Array.from({ length: topology.cells.length }, () => null),
    currentPlayer: firstPlayer,
    scores: { human: 0, computer: 0 },
  };
}

/** Indices of all edges not yet drawn. */
export function legalMoves(state: GameState): number[] {
  const moves: number[] = [];
  for (const [index, drawn] of state.edges.entries()) {
    if (!drawn) moves.push(index);
  }
  return moves;
}

/** How many of a cell's edges have been drawn. */
export function cellEdgeCount(
  topology: Topology,
  edges: readonly boolean[],
  cell: number,
): number {
  let count = 0;
  for (const edge of at(topology.cells, cell)) {
    if (edges[edge]) count += 1;
  }
  return count;
}

/**
 * Draw an edge for the current player. Completing one or more cells claims
 * them and grants the same player another turn; otherwise the turn passes.
 * Throws if the edge is already drawn or the game is over.
 */
export function applyMove(state: GameState, edge: number): GameState {
  if (isGameOver(state)) {
    throw new Error("The game is over");
  }
  if (state.edges[edge] !== false) {
    throw new Error(`Edge ${edge} is not a legal move`);
  }

  const player = state.currentPlayer;
  const edges = [...state.edges];
  const edgeOwners = [...state.edgeOwners];
  const cells = [...state.cells];
  const scores = { ...state.scores };
  edges[edge] = true;
  edgeOwners[edge] = player;

  let completed = 0;
  for (const cell of at(state.topology.edgeCells, edge)) {
    const claimed = cells[cell] !== null;
    const sides = at(state.topology.cells, cell).length;
    if (!claimed && cellEdgeCount(state.topology, edges, cell) === sides) {
      cells[cell] = player;
      completed += 1;
    }
  }
  scores[player] += completed;

  return {
    ...state,
    edges,
    edgeOwners,
    cells,
    scores,
    currentPlayer: completed > 0 ? player : otherPlayer(player),
  };
}

export function otherPlayer(player: Player): Player {
  return player === "human" ? "computer" : "human";
}

export function isGameOver(state: GameState): boolean {
  return (
    state.scores.human + state.scores.computer === state.topology.cells.length
  );
}

export type GameResult = "human" | "computer" | "tie";

export function gameResult(state: GameState): GameResult | null {
  if (!isGameOver(state)) return null;
  if (state.scores.human > state.scores.computer) return "human";
  if (state.scores.computer > state.scores.human) return "computer";
  return "tie";
}

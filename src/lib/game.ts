export type Player = "human" | "computer";

export interface GameState {
  /** Number of box rows. */
  readonly rows: number;
  /** Number of box columns. */
  readonly cols: number;
  /** Whether each edge has been drawn, indexed by `hEdge` / `vEdge`. */
  readonly edges: readonly boolean[];
  /** Who drew each edge (`null` if not yet drawn). */
  readonly edgeOwners: ReadonlyArray<Player | null>;
  /** Owner of each completed box (`null` if unclaimed), row-major. */
  readonly boxes: ReadonlyArray<Player | null>;
  /** Player to move. */
  readonly currentPlayer: Player;
  /** Boxes claimed so far, per player. */
  readonly scores: Record<Player, number>;
}

export function horizontalEdgeCount(rows: number, cols: number): number {
  return (rows + 1) * cols;
}

export function verticalEdgeCount(rows: number, cols: number): number {
  return rows * (cols + 1);
}

export function edgeCount(rows: number, cols: number): number {
  return horizontalEdgeCount(rows, cols) + verticalEdgeCount(rows, cols);
}

/** Index of the horizontal edge between dot (c, r) and dot (c + 1, r). */
export function hEdge(cols: number, r: number, c: number): number {
  return r * cols + c;
}

/** Index of the vertical edge between dot (c, r) and dot (c, r + 1). */
export function vEdge(
  rows: number,
  cols: number,
  r: number,
  c: number,
): number {
  return horizontalEdgeCount(rows, cols) + r * (cols + 1) + c;
}

/** Whether the edge at `index` is horizontal. */
export function isHorizontal(
  rows: number,
  cols: number,
  index: number,
): boolean {
  return index < horizontalEdgeCount(rows, cols);
}

/** Row-major position of the edge in dot coordinates. */
export function edgePosition(
  rows: number,
  cols: number,
  index: number,
): { r: number; c: number; horizontal: boolean } {
  const hCount = horizontalEdgeCount(rows, cols);
  if (index < hCount) {
    return { r: Math.floor(index / cols), c: index % cols, horizontal: true };
  }
  const v = index - hCount;
  const stride = cols + 1;
  return { r: Math.floor(v / stride), c: v % stride, horizontal: false };
}

/** Row-major box index for box row `r`, column `c`. */
export function boxIndex(cols: number, r: number, c: number): number {
  return r * cols + c;
}

/** The four edge indices surrounding box (r, c). */
export function boxEdges(
  rows: number,
  cols: number,
  r: number,
  c: number,
): readonly number[] {
  return [
    hEdge(cols, r, c),
    hEdge(cols, r + 1, c),
    vEdge(rows, cols, r, c),
    vEdge(rows, cols, r, c + 1),
  ];
}

/** Row-major indices of the boxes adjacent to edge `index` (1 or 2 boxes). */
export function boxesForEdge(
  rows: number,
  cols: number,
  index: number,
): readonly number[] {
  const { r, c, horizontal } = edgePosition(rows, cols, index);
  const result: number[] = [];
  if (horizontal) {
    if (r > 0) result.push(boxIndex(cols, r - 1, c));
    if (r < rows) result.push(boxIndex(cols, r, c));
  } else {
    if (c > 0) result.push(boxIndex(cols, r, c - 1));
    if (c < cols) result.push(boxIndex(cols, r, c));
  }
  return result;
}

/** How many of a box's four edges have been drawn. */
export function boxEdgeCount(
  state: Pick<GameState, "rows" | "cols" | "edges">,
  box: number,
): number {
  const r = Math.floor(box / state.cols);
  const c = box % state.cols;
  let count = 0;
  for (const edge of boxEdges(state.rows, state.cols, r, c)) {
    if (state.edges[edge]) count += 1;
  }
  return count;
}

export function createGame(
  rows: number,
  cols: number,
  firstPlayer: Player = "human",
): GameState {
  return {
    rows,
    cols,
    edges: Array.from({ length: edgeCount(rows, cols) }, () => false),
    edgeOwners: Array.from({ length: edgeCount(rows, cols) }, () => null),
    boxes: Array.from({ length: rows * cols }, () => null),
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

/**
 * Draw an edge for the current player. Completing one or more boxes claims
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
  const boxes = [...state.boxes];
  const scores = { ...state.scores };
  edges[edge] = true;
  edgeOwners[edge] = player;

  let completed = 0;
  for (const box of boxesForEdge(state.rows, state.cols, edge)) {
    if (boxes[box] === null && boxEdgeCount({ ...state, edges }, box) === 4) {
      boxes[box] = player;
      completed += 1;
    }
  }
  scores[player] += completed;

  return {
    ...state,
    edges,
    edgeOwners,
    boxes,
    scores,
    currentPlayer: completed > 0 ? player : otherPlayer(player),
  };
}

export function otherPlayer(player: Player): Player {
  return player === "human" ? "computer" : "human";
}

export function isGameOver(state: GameState): boolean {
  return state.scores.human + state.scores.computer === state.rows * state.cols;
}

export type GameResult = "human" | "computer" | "tie";

export function gameResult(state: GameState): GameResult | null {
  if (!isGameOver(state)) return null;
  if (state.scores.human > state.scores.computer) return "human";
  if (state.scores.computer > state.scores.human) return "computer";
  return "tie";
}

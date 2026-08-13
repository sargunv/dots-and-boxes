import { describe, expect, test } from "vite-plus/test";

import { chooseMove } from "./ai.ts";
import {
  applyMove,
  boxEdgeCount,
  createGame,
  hEdge,
  isGameOver,
  vEdge,
} from "./game.ts";
import type { GameState, Player } from "./game.ts";

/** Build a state with the given edges already drawn, bypassing turn order. */
function makeState(
  rows: number,
  cols: number,
  drawn: readonly number[],
  currentPlayer: Player,
): GameState {
  const base = createGame(rows, cols, currentPlayer);
  const edges = [...base.edges];
  const edgeOwners = [...base.edgeOwners];
  for (const edge of drawn) {
    edges[edge] = true;
    edgeOwners[edge] = "human";
  }
  const boxes = base.boxes.map((_, box) =>
    boxEdgeCount({ rows, cols, edges }, box) === 4 ? "human" : null,
  );
  const claimed = boxes.filter((box) => box !== null).length;
  return {
    ...base,
    edges,
    edgeOwners,
    boxes,
    scores: { human: claimed, computer: 0 },
  };
}

describe("chooseMove", () => {
  test("takes a free box at every difficulty", () => {
    // Box (0, 0) of a 2x2 board has three edges drawn; the bottom edge is free.
    const state = makeState(
      2,
      2,
      [hEdge(2, 0, 0), vEdge(2, 2, 0, 0), vEdge(2, 2, 0, 1)],
      "computer",
    );
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(chooseMove(state, difficulty)).toBe(hEdge(2, 1, 0));
    }
  });

  test("avoids handing the opponent a box when safe moves exist", () => {
    // Box (0, 0) of a 3x3 board has two edges drawn; completing a third edge
    // would let the human claim it next turn.
    const dangerous = [hEdge(3, 1, 0), vEdge(3, 3, 0, 1)];
    const state = makeState(
      3,
      3,
      [hEdge(3, 0, 0), vEdge(3, 3, 0, 0)],
      "computer",
    );
    const move = chooseMove(state, "medium");
    expect(dangerous).not.toContain(move);
  });

  test("returns null when no moves remain", () => {
    const full = Array.from({ length: 24 }, (_, i) => i);
    expect(chooseMove(makeState(2, 2, full, "computer"), "hard")).toBeNull();
  });

  test("plays a complete game against itself", () => {
    let game = createGame(2, 2, "human");
    while (!isGameOver(game)) {
      const difficulty = game.currentPlayer === "computer" ? "hard" : "easy";
      const move = chooseMove(game, difficulty);
      expect(move).not.toBeNull();
      if (move === null) throw new Error("unreachable");
      game = applyMove(game, move);
    }
    expect(game.scores.human + game.scores.computer).toBe(4);
    expect(game.boxes).not.toContain(null);
  });
});

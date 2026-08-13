import { describe, expect, test } from "vite-plus/test";

import { chooseMove } from "./ai.ts";
import { applyMove, cellEdgeCount, createGame, isGameOver } from "./game.ts";
import type { GameState, Player } from "./game.ts";
import {
  at,
  buildTopology,
  squarePolygons,
  triangularPolygons,
} from "./topology.ts";
import type { Topology } from "./topology.ts";

/** Build a state with the given edges already drawn, bypassing turn order. */
function makeState(
  topology: Topology,
  drawn: readonly number[],
  currentPlayer: Player,
): GameState {
  const base = createGame(topology, currentPlayer);
  const edges = [...base.edges];
  const edgeOwners = [...base.edgeOwners];
  for (const edge of drawn) {
    edges[edge] = true;
    edgeOwners[edge] = "human";
  }
  const cells = base.cells.map((_, cell) =>
    cellEdgeCount(topology, edges, cell) === at(topology.cells, cell).length
      ? "human"
      : null,
  );
  const claimed = cells.filter((cell) => cell !== null).length;
  return {
    ...base,
    edges,
    edgeOwners,
    cells,
    scores: { human: claimed, computer: 0 },
  };
}

describe("chooseMove", () => {
  test("takes a free cell at every difficulty", () => {
    // The first cell of a 2x2 square board has three edges drawn.
    const topology = buildTopology(squarePolygons(2, 2));
    const cell = at(topology.cells, 0);
    const drawn = [at(cell, 0), at(cell, 1), at(cell, 2)];
    const state = makeState(topology, drawn, "computer");
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(chooseMove(state, difficulty)).toBe(at(cell, 3));
    }
  });

  test("avoids handing the opponent a cell when safe moves exist", () => {
    // The first cell of a 3x3 board has two edges drawn; drawing a third
    // would let the human claim it next turn.
    const topology = buildTopology(squarePolygons(3, 3));
    const cell = at(topology.cells, 0);
    const drawn = [at(cell, 0), at(cell, 1)];
    const dangerous = [at(cell, 2), at(cell, 3)];
    const state = makeState(topology, drawn, "computer");
    const move = chooseMove(state, "medium");
    expect(dangerous).not.toContain(move);
  });

  test("returns null when no moves remain", () => {
    const topology = buildTopology(squarePolygons(2, 2));
    const full = topology.edges.map((_, edge) => edge);
    expect(
      chooseMove(makeState(topology, full, "computer"), "hard"),
    ).toBeNull();
  });

  test("plays a complete game against itself on a square board", () => {
    let game = createGame(buildTopology(squarePolygons(2, 2)), "human");
    while (!isGameOver(game)) {
      const difficulty = game.currentPlayer === "computer" ? "hard" : "easy";
      const move = chooseMove(game, difficulty);
      expect(move).not.toBeNull();
      if (move === null) throw new Error("unreachable");
      game = applyMove(game, move);
    }
    expect(game.scores.human + game.scores.computer).toBe(4);
    expect(game.cells).not.toContain(null);
  });

  test("plays a complete game against itself on a triangular board", () => {
    let game = createGame(buildTopology(triangularPolygons(2)), "human");
    while (!isGameOver(game)) {
      const difficulty = game.currentPlayer === "computer" ? "hard" : "easy";
      const move = chooseMove(game, difficulty);
      expect(move).not.toBeNull();
      if (move === null) throw new Error("unreachable");
      game = applyMove(game, move);
    }
    expect(game.scores.human + game.scores.computer).toBe(4);
    expect(game.cells).not.toContain(null);
  });
});

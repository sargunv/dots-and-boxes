import { describe, expect, test } from "vite-plus/test";

import {
  applyMove,
  cellEdgeCount,
  createGame,
  gameResult,
  isGameOver,
  legalMoves,
} from "./game.ts";
import {
  at,
  buildTopology,
  preDrawnEdges,
  squarePolygons,
  triangularPolygons,
} from "./topology.ts";

const square = (rows: number, cols = rows) =>
  buildTopology(squarePolygons(rows, cols));

describe("createGame", () => {
  test("creates an empty 2x2 game", () => {
    const game = createGame(square(2));
    expect(game.edges).toHaveLength(12);
    expect(game.cells).toEqual([null, null, null, null]);
    expect(game.currentPlayer).toBe("human");
    expect(game.scores).toEqual({ human: 0, computer: 0 });
    expect(legalMoves(game)).toHaveLength(12);
  });

  test("pre-drawn edges start drawn and ownerless", () => {
    const topology = square(2);
    const game = createGame(
      topology,
      "human",
      preDrawnEdges(topology, "swedish"),
    );
    expect(game.edges.filter(Boolean)).toHaveLength(8);
    expect(game.edgeOwners.every((owner) => owner === null)).toBe(true);
    expect(legalMoves(game)).toHaveLength(4);
    expect(game.scores).toEqual({ human: 0, computer: 0 });
  });
});

describe("applyMove", () => {
  test("passes the turn when no cell is completed", () => {
    const game = createGame(square(2));
    const edge = at(legalMoves(game), 0);
    const next = applyMove(game, edge);
    expect(next.edges[edge]).toBe(true);
    expect(next.edgeOwners[edge]).toBe("human");
    expect(next.currentPlayer).toBe("computer");
    expect(next.scores).toEqual({ human: 0, computer: 0 });
  });

  test("claims the cell and keeps the turn when a cell is completed", () => {
    const topology = square(1);
    const cell = at(topology.cells, 0);
    let game = createGame(topology);
    game = applyMove(game, at(cell, 0)); // human
    game = applyMove(game, at(cell, 1)); // computer
    game = applyMove(game, at(cell, 2)); // human
    expect(game.currentPlayer).toBe("computer");

    game = applyMove(game, at(cell, 3)); // computer completes the cell
    expect(game.cells).toEqual(["computer"]);
    expect(game.scores).toEqual({ human: 0, computer: 1 });
    expect(game.currentPlayer).toBe("computer");
    expect(isGameOver(game)).toBe(true);
    expect(gameResult(game)).toBe("computer");
  });

  test("claims triangular cells with three edges", () => {
    const topology = buildTopology(triangularPolygons(2));
    const cell = at(topology.cells, 0);
    let game = createGame(topology);
    game = applyMove(game, at(cell, 0)); // human
    game = applyMove(game, at(cell, 1)); // computer
    game = applyMove(game, at(cell, 2)); // human completes the triangle
    expect(game.cells[0]).toBe("human");
    expect(game.scores).toEqual({ human: 1, computer: 0 });
    expect(game.currentPlayer).toBe("human");
  });

  test("can claim two cells with a single shared edge", () => {
    const topology = square(1, 2);
    const shared = at(topology.cells, 0).find((edge) =>
      at(topology.cells, 1).includes(edge),
    );
    if (shared === undefined) throw new Error("expected a shared edge");

    let game = createGame(topology);
    for (const edge of topology.edges.map((_, i) => i)) {
      if (edge !== shared) game = applyMove(game, edge);
    }
    game = applyMove(game, shared);
    expect(game.scores).toEqual({ human: 2, computer: 0 });
    expect(isGameOver(game)).toBe(true);
    expect(gameResult(game)).toBe("human");
  });

  test("rejects drawing an already-drawn edge", () => {
    const game = applyMove(createGame(square(2)), 0);
    expect(() => applyMove(game, 0)).toThrow("not a legal move");
  });

  test("rejects moves after the game is over", () => {
    let game = createGame(square(1));
    for (const edge of [0, 1, 2, 3]) game = applyMove(game, edge);
    expect(() => applyMove(game, 0)).toThrow("The game is over");
  });
});

describe("cellEdgeCount", () => {
  test("counts drawn edges around a cell", () => {
    const topology = square(2);
    const game = applyMove(createGame(topology), at(at(topology.cells, 0), 0));
    expect(cellEdgeCount(topology, game.edges, 0)).toBe(1);
    expect(cellEdgeCount(topology, game.edges, 3)).toBe(0);
  });
});

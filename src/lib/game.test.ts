import { describe, expect, test } from "vite-plus/test";

import {
  applyMove,
  boxEdgeCount,
  boxesForEdge,
  createGame,
  edgeCount,
  gameResult,
  hEdge,
  isGameOver,
  legalMoves,
  vEdge,
} from "./game.ts";

describe("createGame", () => {
  test("creates an empty 2x2 game", () => {
    const game = createGame(2, 2);
    expect(game.edges).toHaveLength(edgeCount(2, 2));
    expect(edgeCount(2, 2)).toBe(12);
    expect(game.boxes).toEqual([null, null, null, null]);
    expect(game.currentPlayer).toBe("human");
    expect(game.scores).toEqual({ human: 0, computer: 0 });
    expect(legalMoves(game)).toHaveLength(12);
  });
});

describe("applyMove", () => {
  test("passes the turn when no box is completed", () => {
    const game = applyMove(createGame(2, 2), hEdge(2, 0, 0));
    expect(game.edges[hEdge(2, 0, 0)]).toBe(true);
    expect(game.edgeOwners[hEdge(2, 0, 0)]).toBe("human");
    expect(game.currentPlayer).toBe("computer");
    expect(game.scores).toEqual({ human: 0, computer: 0 });
  });

  test("claims the box and keeps the turn when a box is completed", () => {
    let game = createGame(1, 1);
    game = applyMove(game, hEdge(1, 0, 0)); // top (human)
    game = applyMove(game, vEdge(1, 1, 0, 0)); // left (computer)
    game = applyMove(game, vEdge(1, 1, 0, 1)); // right (human)
    expect(game.currentPlayer).toBe("computer");

    game = applyMove(game, hEdge(1, 1, 0)); // bottom completes the box
    expect(game.boxes).toEqual(["computer"]);
    expect(game.scores).toEqual({ human: 0, computer: 1 });
    expect(game.currentPlayer).toBe("computer");
    expect(isGameOver(game)).toBe(true);
    expect(gameResult(game)).toBe("computer");
  });

  test("can claim two boxes with a single shared edge", () => {
    let game = createGame(1, 2);
    // Draw every edge except the shared vertical edge between the two boxes.
    for (const edge of [
      hEdge(2, 0, 0),
      hEdge(2, 0, 1),
      hEdge(2, 1, 0),
      hEdge(2, 1, 1),
      vEdge(1, 2, 0, 0),
      vEdge(1, 2, 0, 2),
    ]) {
      game = applyMove(game, edge);
    }
    game = applyMove(game, vEdge(1, 2, 0, 1));
    expect(game.scores).toEqual({ human: 2, computer: 0 });
    expect(isGameOver(game)).toBe(true);
    expect(gameResult(game)).toBe("human");
  });

  test("rejects drawing an already-drawn edge", () => {
    const game = applyMove(createGame(2, 2), 0);
    expect(() => applyMove(game, 0)).toThrow("not a legal move");
  });

  test("rejects moves after the game is over", () => {
    let game = createGame(1, 1);
    for (const edge of [0, 1, 2, 3]) game = applyMove(game, edge);
    expect(() => applyMove(game, 0)).toThrow("The game is over");
  });
});

describe("box helpers", () => {
  test("counts drawn edges around a box", () => {
    const game = applyMove(createGame(2, 2), hEdge(2, 0, 0));
    expect(boxEdgeCount(game, 0)).toBe(1);
    expect(boxEdgeCount(game, 1)).toBe(0);
  });

  test("lists adjacent boxes for interior and boundary edges", () => {
    // Shared horizontal edge between the two rows of a 2x2 board.
    expect(boxesForEdge(2, 2, hEdge(2, 1, 0))).toEqual([0, 2]);
    // Top boundary edge touches one box.
    expect(boxesForEdge(2, 2, hEdge(2, 0, 0))).toEqual([0]);
    // Shared vertical edge between the two columns.
    expect(boxesForEdge(2, 2, vEdge(2, 2, 0, 1))).toEqual([0, 1]);
  });
});

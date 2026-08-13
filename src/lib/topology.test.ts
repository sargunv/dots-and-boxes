import { describe, expect, test } from "vite-plus/test";

import {
  at,
  buildTopology,
  hexagonPolygons,
  preDrawnEdges,
  squarePolygons,
  triangularPolygons,
} from "./topology.ts";

describe("buildTopology", () => {
  test("square 2x2 board", () => {
    const topology = buildTopology(squarePolygons(2, 2));
    expect(topology.vertices).toHaveLength(9);
    expect(topology.edges).toHaveLength(12);
    expect(topology.cells).toHaveLength(4);
    for (const cell of topology.cells) expect(cell).toHaveLength(4);
    // 8 boundary edges touch one cell, 4 interior edges touch two.
    const boundary = topology.edgeCells.filter((cells) => cells.length === 1);
    const interior = topology.edgeCells.filter((cells) => cells.length === 2);
    expect(boundary).toHaveLength(8);
    expect(interior).toHaveLength(4);
  });

  test("triangular side-2 board", () => {
    const topology = buildTopology(triangularPolygons(2));
    expect(topology.vertices).toHaveLength(6);
    expect(topology.edges).toHaveLength(9);
    expect(topology.cells).toHaveLength(4);
    for (const cell of topology.cells) expect(cell).toHaveLength(3);
  });

  test("single hexagon", () => {
    const topology = buildTopology(hexagonPolygons(1, 1));
    expect(topology.vertices).toHaveLength(6);
    expect(topology.edges).toHaveLength(6);
    expect(topology.cells).toHaveLength(1);
  });

  test("two adjacent hexagons share exactly one edge", () => {
    const topology = buildTopology(hexagonPolygons(1, 2));
    expect(topology.vertices).toHaveLength(10);
    expect(topology.edges).toHaveLength(11);
    expect(topology.cells).toHaveLength(2);
    const shared = topology.edgeCells.filter((cells) => cells.length === 2);
    expect(shared).toHaveLength(1);
  });

  test("edgeCells is the inverse of cells", () => {
    const topology = buildTopology(triangularPolygons(3));
    for (const [cell, cellEdges] of topology.cells.entries()) {
      for (const edge of cellEdges) {
        expect(at(topology.edgeCells, edge)).toContain(cell);
      }
    }
  });
});

describe("preDrawnEdges", () => {
  const topology = buildTopology(squarePolygons(2, 2));

  test("american boards start blank", () => {
    expect(preDrawnEdges(topology, "american")).toEqual([]);
  });

  test("swedish boards pre-draw the whole border", () => {
    expect(preDrawnEdges(topology, "swedish")).toHaveLength(8);
  });

  test("icelandic boards pre-draw only the left and bottom sides", () => {
    expect(preDrawnEdges(topology, "icelandic")).toHaveLength(4);
  });
});

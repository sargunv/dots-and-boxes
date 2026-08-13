/**
 * Board topology for dots-and-boxes-style games. The game is playable on an
 * arbitrary graph (the "Strings-and-Coins" dual form): dots are vertices,
 * drawable lines are edges, and claimable regions are cells bounded by edges.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Topology {
  /** Dot positions, in arbitrary units (the renderer scales them). */
  readonly vertices: readonly Point[];
  /** Playable lines, as pairs of vertex indices. */
  readonly edges: ReadonlyArray<readonly [number, number]>;
  /** Claimable regions, as lists of edge indices. */
  readonly cells: ReadonlyArray<readonly number[]>;
  /** Vertex ring per cell, for rendering the claimed region. */
  readonly cellPolygons: ReadonlyArray<readonly number[]>;
  /** Cells adjacent to each edge (1 on the boundary, 2 in the interior). */
  readonly edgeCells: ReadonlyArray<readonly number[]>;
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

/** Bounds-checked element access (the project forbids `!` assertions). */
export function at<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`Index ${index} out of range (length ${items.length})`);
  }
  return value;
}

/**
 * Build a topology from a list of cell polygons (ordered point rings).
 * Vertices and edges are deduplicated by coordinates, so layouts can emit
 * overlapping cell outlines independently.
 */
export function buildTopology(
  polygons: ReadonlyArray<readonly Point[]>,
): Topology {
  const vertexIds = new Map<string, number>();
  const vertices: Point[] = [];
  const edgeIds = new Map<string, number>();
  const edges: Array<readonly [number, number]> = [];
  const cells: number[][] = [];
  const cellPolygons: number[][] = [];

  const vertexId = (point: Point): number => {
    // Quantized key tolerates floating-point noise from layout math.
    const key = `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
    const existing = vertexIds.get(key);
    if (existing !== undefined) return existing;
    const id = vertices.length;
    vertices.push(point);
    vertexIds.set(key, id);
    return id;
  };

  for (const polygon of polygons) {
    const ring = polygon.map(vertexId);
    const cellEdges: number[] = [];
    for (const [i, a] of ring.entries()) {
      const b = at(ring, (i + 1) % ring.length);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const key = `${lo}:${hi}`;
      let id = edgeIds.get(key);
      if (id === undefined) {
        id = edges.length;
        edges.push([lo, hi]);
        edgeIds.set(key, id);
      }
      cellEdges.push(id);
    }
    cells.push(cellEdges);
    cellPolygons.push(ring);
  }

  const edgeCells: number[][] = edges.map(() => []);
  for (const [cell, cellEdges] of cells.entries()) {
    for (const edge of cellEdges) at(edgeCells, edge).push(cell);
  }

  return {
    vertices,
    edges,
    cells,
    cellPolygons,
    edgeCells,
    bounds: {
      minX: Math.min(...vertices.map((v) => v.x)),
      minY: Math.min(...vertices.map((v) => v.y)),
      maxX: Math.max(...vertices.map((v) => v.x)),
      maxY: Math.max(...vertices.map((v) => v.y)),
    },
  };
}

/** Square board: `rows` × `cols` four-sided cells. */
export function squarePolygons(rows: number, cols: number): Point[][] {
  const polygons: Point[][] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      polygons.push([
        { x: c, y: r },
        { x: c + 1, y: r },
        { x: c + 1, y: r + 1 },
        { x: c, y: r + 1 },
      ]);
    }
  }
  return polygons;
}

/**
 * Triangular board: a big triangle of side `side` on a triangular lattice,
 * containing `side`² three-sided cells.
 */
export function triangularPolygons(side: number): Point[][] {
  const height = Math.sqrt(3) / 2;
  const dot = (a: number, b: number): Point => ({
    x: a + b / 2,
    y: b * height,
  });
  const polygons: Point[][] = [];
  for (let b = 0; b < side; b += 1) {
    for (let a = 0; a + b < side; a += 1) {
      polygons.push([dot(a, b), dot(a + 1, b), dot(a, b + 1)]);
      if (a + b < side - 1) {
        polygons.push([dot(a + 1, b), dot(a + 1, b + 1), dot(a, b + 1)]);
      }
    }
  }
  return polygons;
}

/** Hexagonal board: `rows` × `cols` flat-top six-sided cells. */
export function hexagonPolygons(rows: number, cols: number): Point[][] {
  const height = Math.sqrt(3) / 2;
  const polygons: Point[][] = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const cx = c * 1.5;
      const cy = (r + (c % 2) * 0.5) * 2 * height;
      const corners: Point[] = [];
      for (let k = 0; k < 6; k += 1) {
        const angle = (Math.PI / 3) * k;
        corners.push({ x: cx + Math.cos(angle), y: cy + Math.sin(angle) });
      }
      polygons.push(corners);
    }
  }
  return polygons;
}

/**
 * Starting position style. American boards start blank, Swedish boards have
 * the whole outer border pre-drawn, and Icelandic boards start with only the
 * left and bottom border edges drawn.
 */
export type BoardStyle = "american" | "swedish" | "icelandic";

/** Edges pre-drawn at game start for the given style (ownerless). */
export function preDrawnEdges(topology: Topology, style: BoardStyle): number[] {
  if (style === "american") return [];
  const boundary = topology.edges
    .map((_, edge) => edge)
    .filter((edge) => at(topology.edgeCells, edge).length === 1);
  if (style === "swedish") return boundary;

  const { minX, maxY } = topology.bounds;
  const epsilon = 1e-6;
  return boundary.filter((edge) => {
    const [a, b] = at(topology.edges, edge);
    const pa = at(topology.vertices, a);
    const pb = at(topology.vertices, b);
    const onLeft =
      Math.abs(pa.x - minX) < epsilon && Math.abs(pb.x - minX) < epsilon;
    const onBottom =
      Math.abs(pa.y - maxY) < epsilon && Math.abs(pb.y - maxY) < epsilon;
    return onLeft || onBottom;
  });
}

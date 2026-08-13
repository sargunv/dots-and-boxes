import { useState } from "react";

import { cellEdgeCount } from "../lib/game.ts";
import type { GameState, Player } from "../lib/game.ts";
import { at } from "../lib/topology.ts";
import { cx } from "../ui/cx.ts";

const SCALE = 64;
const PADDING = 32;

interface GameBoardProps {
  readonly game: GameState;
  /** Whether the human may draw edges right now. */
  readonly interactive: boolean;
  readonly lastMove: number | null;
  readonly onEdgeClick: (edge: number) => void;
}

export function GameBoard({
  game,
  interactive,
  lastMove,
  onEdgeClick,
}: GameBoardProps) {
  const { topology } = game;
  const { minX, minY, maxX, maxY } = topology.bounds;
  const width = (maxX - minX) * SCALE + 2 * PADDING;
  const height = (maxY - minY) * SCALE + 2 * PADDING;
  const x = (vertex: number) =>
    PADDING + (at(topology.vertices, vertex).x - minX) * SCALE;
  const y = (vertex: number) =>
    PADDING + (at(topology.vertices, vertex).y - minY) * SCALE;

  const [hovered, setHovered] = useState<number | null>(null);

  // Cells the hovered edge would complete, shown as a faint preview.
  const previewCells = new Set<number>();
  if (interactive && hovered !== null) {
    for (const cell of at(topology.edgeCells, hovered)) {
      const sides = at(topology.cells, cell).length;
      const unclaimed = game.cells[cell] === null;
      if (
        unclaimed &&
        cellEdgeCount(topology, game.edges, cell) === sides - 1
      ) {
        previewCells.add(cell);
      }
    }
  }

  /** Cell polygon (shrunk toward its bbox center) plus center and size. */
  function cellGeometry(cell: number) {
    const ring = at(topology.cellPolygons, cell);
    const px = ring.map(x);
    const py = ring.map(y);
    const minPx = Math.min(...px);
    const maxPx = Math.max(...px);
    const minPy = Math.min(...py);
    const maxPy = Math.max(...py);
    const cx0 = (minPx + maxPx) / 2;
    const cy0 = (minPy + maxPy) / 2;
    const points = ring
      .map((v) => `${cx0 + (x(v) - cx0) * 0.82},${cy0 + (y(v) - cy0) * 0.82}`)
      .join(" ");
    return {
      points,
      centerX: cx0,
      centerY: cy0,
      size: Math.min(maxPx - minPx, maxPy - minPy),
    };
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Dots and boxes board"
    >
      {/* Preview of cells the hovered edge would claim */}
      {[...previewCells].map((cell) => (
        <polygon
          key={`preview-${cell}`}
          points={cellGeometry(cell).points}
          className="fill-primary/15 pointer-events-none"
        />
      ))}

      {/* Claimed cells: ink wash plus a stamped handwritten initial */}
      {game.cells.map((owner, cell) => {
        if (owner === null) return null;
        const { points, centerX, centerY, size } = cellGeometry(cell);
        return (
          <g key={`cell-${cell}`}>
            <polygon points={points} className={ownerClass(owner, "fill")} />
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              className={cx(
                "anim-stamp font-display pointer-events-none select-none",
                owner === "human" ? "fill-primary" : "fill-secondary",
              )}
              style={{
                fontSize: size * 0.55,
                fontWeight: 700,
                rotate: `${((cell * 37) % 9) - 4}deg`,
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            >
              {owner === "human" ? "Y" : "C"}
            </text>
          </g>
        );
      })}

      {/* Edges */}
      {topology.edges.map(([a, b], edge) => {
        const points = { x1: x(a), y1: y(a), x2: x(b), y2: y(b) };
        const drawn = game.edges[edge] === true;
        const owner = game.edgeOwners[edge] ?? null;

        if (drawn) {
          return (
            <g key={`edge-${edge}`}>
              {edge === lastMove && (
                <line
                  {...points}
                  className="stroke-accent/35"
                  strokeWidth={10}
                  strokeLinecap="round"
                />
              )}
              <line
                {...points}
                pathLength={1}
                className={
                  owner === null
                    ? "stroke-base-content/40"
                    : cx(ownerClass(owner, "stroke"), "anim-draw-in")
                }
                strokeWidth={6}
                strokeLinecap="round"
              />
            </g>
          );
        }

        return (
          <g
            key={`edge-${edge}`}
            className={cx(interactive && "group cursor-pointer")}
            onMouseEnter={() => setHovered(edge)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (interactive) onEdgeClick(edge);
            }}
          >
            <line
              {...points}
              className="stroke-base-300"
              strokeWidth={4}
              strokeDasharray="2 10"
              strokeLinecap="round"
            />
            {interactive && (
              <line
                {...points}
                className="stroke-primary opacity-0 transition-opacity group-hover:opacity-40"
                strokeWidth={6}
                strokeLinecap="round"
              />
            )}
            {/* Fat invisible hit area */}
            <line {...points} className="stroke-transparent" strokeWidth={24} />
          </g>
        );
      })}

      {/* Dots */}
      {topology.vertices.map((_, vertex) => (
        <circle
          key={`dot-${vertex}`}
          cx={x(vertex)}
          cy={y(vertex)}
          r={5}
          className="fill-base-content"
        />
      ))}
    </svg>
  );
}

function ownerClass(owner: Player, kind: "fill" | "stroke"): string {
  if (owner === "human") {
    return kind === "fill" ? "fill-primary/25" : "stroke-primary";
  }
  return kind === "fill" ? "fill-secondary/25" : "stroke-secondary";
}

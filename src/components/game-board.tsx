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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Dots and boxes board"
    >
      {/* Claimed cells */}
      {game.cells.map((owner, cell) => {
        if (owner === null) return null;
        const ring = at(topology.cellPolygons, cell);
        // Shrink the polygon toward its centroid so adjacent claimed cells
        // keep a visible gap between them.
        const cx0 = ring.reduce((sum, v) => sum + x(v), 0) / ring.length;
        const cy0 = ring.reduce((sum, v) => sum + y(v), 0) / ring.length;
        const points = ring
          .map((v) => {
            const px = cx0 + (x(v) - cx0) * 0.82;
            const py = cy0 + (y(v) - cy0) * 0.82;
            return `${px},${py}`;
          })
          .join(" ");
        return (
          <polygon
            key={`cell-${cell}`}
            points={points}
            className={ownerClass(owner, "fill")}
          />
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
                  className="stroke-accent/40"
                  strokeWidth={14}
                  strokeLinecap="round"
                />
              )}
              <line
                {...points}
                className={
                  owner === null
                    ? "stroke-base-content/40"
                    : ownerClass(owner, "stroke")
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

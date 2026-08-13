import { edgeCount, edgePosition } from "../lib/game.ts";
import type { GameState, Player } from "../lib/game.ts";
import { cx } from "../ui/cx.ts";

const SPACING = 64;
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
  const { rows, cols } = game;
  const width = 2 * PADDING + cols * SPACING;
  const height = 2 * PADDING + rows * SPACING;
  const x = (c: number) => PADDING + c * SPACING;
  const y = (r: number) => PADDING + r * SPACING;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Dots and boxes board"
    >
      {/* Claimed boxes */}
      {game.boxes.map((owner, box) => {
        if (owner === null) return null;
        const r = Math.floor(box / cols);
        const c = box % cols;
        return (
          <rect
            key={`box-${box}`}
            x={x(c) + 8}
            y={y(r) + 8}
            width={SPACING - 16}
            height={SPACING - 16}
            rx={10}
            className={ownerClass(owner, "fill")}
          />
        );
      })}

      {/* Edges */}
      {Array.from({ length: edgeCount(rows, cols) }, (_, edge) => {
        const { r, c, horizontal } = edgePosition(rows, cols, edge);
        const points = {
          x1: x(c),
          y1: y(r),
          x2: x(horizontal ? c + 1 : c),
          y2: y(horizontal ? r : r + 1),
        };
        const owner = game.edgeOwners[edge] ?? null;

        if (owner !== null) {
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
                className={ownerClass(owner, "stroke")}
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
            <line {...points} className="stroke-transparent" strokeWidth={28} />
          </g>
        );
      })}

      {/* Dots */}
      {Array.from({ length: rows + 1 }, (_, r) =>
        Array.from({ length: cols + 1 }, (_, c) => (
          <circle
            key={`dot-${r}-${c}`}
            cx={x(c)}
            cy={y(r)}
            r={5}
            className="fill-base-content"
          />
        )),
      )}
    </svg>
  );
}

function ownerClass(owner: Player, kind: "fill" | "stroke"): string {
  if (owner === "human")
    return kind === "fill" ? "fill-primary/25" : "stroke-primary";
  return kind === "fill" ? "fill-secondary/25" : "stroke-secondary";
}

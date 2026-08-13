import { useEffect, useState } from "react";

import { requestMove } from "../lib/ai-client.ts";
import type { Difficulty } from "../lib/ai.ts";
import { applyMove, createGame, gameResult, isGameOver } from "../lib/game.ts";
import type { GameState } from "../lib/game.ts";
import {
  at,
  buildTopology,
  hexagonPolygons,
  preDrawnEdges,
  squarePolygons,
  triangularPolygons,
} from "../lib/topology.ts";
import type { BoardStyle, Topology } from "../lib/topology.ts";
import { cx } from "../ui/cx.ts";
import { GameBoard } from "./game-board.tsx";

type GridKind = "square" | "triangular" | "hexagonal";

interface GridOption {
  readonly value: GridKind;
  readonly label: string;
  readonly sizes: readonly number[];
  readonly defaultSize: number;
}

const GRIDS: readonly GridOption[] = [
  { value: "square", label: "Square", sizes: [2, 3, 4, 5], defaultSize: 3 },
  {
    value: "triangular",
    label: "Triangular",
    sizes: [3, 4, 5, 6],
    defaultSize: 4,
  },
  {
    value: "hexagonal",
    label: "Hexagonal",
    sizes: [2, 3, 4],
    defaultSize: 3,
  },
];

const STYLES: readonly { value: BoardStyle; label: string }[] = [
  { value: "american", label: "American (blank)" },
  { value: "swedish", label: "Swedish (border drawn)" },
  { value: "icelandic", label: "Icelandic (left + bottom drawn)" },
];

const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const COMPUTER_MOVE_DELAY_MS = 450;

function buildBoard(grid: GridKind, size: number): Topology {
  if (grid === "triangular") return buildTopology(triangularPolygons(size));
  if (grid === "hexagonal") return buildTopology(hexagonPolygons(size, size));
  return buildTopology(squarePolygons(size, size));
}

function gridOption(grid: GridKind): GridOption {
  return GRIDS.find((option) => option.value === grid) ?? at(GRIDS, 0);
}

export function Game() {
  const [grid, setGrid] = useState<GridKind>("square");
  const [size, setSize] = useState(3);
  const [style, setStyle] = useState<BoardStyle>("american");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [game, setGame] = useState<GameState>(() =>
    createGame(buildBoard("square", 3)),
  );
  const [lastMove, setLastMove] = useState<number | null>(null);

  const over = isGameOver(game);
  const computerTurn = !over && game.currentPlayer === "computer";
  const result = gameResult(game);

  useEffect(() => {
    if (!computerTurn) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void requestMove(game, difficulty).then((move) => {
        if (cancelled || move === null) return;
        // The guard skips stale responses (e.g. a new game started while the
        // worker was thinking, or a StrictMode double-invoked effect).
        setGame((current) =>
          current === game ? applyMove(current, move) : current,
        );
        setLastMove(move);
      });
    }, COMPUTER_MOVE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [computerTurn, game, difficulty]);

  function handleEdgeClick(edge: number) {
    if (computerTurn || over || game.edges[edge] !== false) return;
    setGame(applyMove(game, edge));
    setLastMove(edge);
  }

  function startNewGame(
    nextGrid: GridKind,
    nextSize: number,
    nextStyle: BoardStyle,
  ) {
    // Board styles are named for the classic square game; other grids
    // always start blank.
    const effectiveStyle = nextGrid === "square" ? nextStyle : "american";
    setGrid(nextGrid);
    setSize(nextSize);
    setStyle(effectiveStyle);
    const topology = buildBoard(nextGrid, nextSize);
    setGame(
      createGame(topology, "human", preDrawnEdges(topology, effectiveStyle)),
    );
    setLastMove(null);
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="card bg-base-100 border-base-300 w-full max-w-2xl border shadow-sm">
        <div className="card-body items-center gap-4">
          <h1 className="card-title text-2xl">Dots and Boxes</h1>

          <div className="flex items-center gap-3">
            <span className="badge badge-primary badge-lg">
              You: {game.scores.human}
            </span>
            <span className="text-base-content/50 text-sm">vs</span>
            <span className="badge badge-secondary badge-lg">
              Computer: {game.scores.computer}
            </span>
          </div>

          <p
            className={cx(
              "text-sm font-medium",
              result === "human" && "text-success",
              result === "computer" && "text-error",
              result === null && "text-base-content/70",
            )}
            aria-live="polite"
          >
            {statusText(result, computerTurn)}
          </p>

          <GameBoard
            game={game}
            interactive={!computerTurn && !over}
            lastMove={lastMove}
            onEdgeClick={handleEdgeClick}
          />

          <div className="flex flex-wrap items-end justify-center gap-3">
            <label className="form-control">
              <span className="label-text mb-1">Grid</span>
              <select
                className="select select-bordered select-sm"
                value={grid}
                onChange={(event) => {
                  const nextGrid = parseGrid(event.target.value);
                  startNewGame(
                    nextGrid,
                    gridOption(nextGrid).defaultSize,
                    style,
                  );
                }}
              >
                {GRIDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Size</span>
              <select
                className="select select-bordered select-sm"
                value={size}
                onChange={(event) =>
                  startNewGame(grid, Number(event.target.value), style)
                }
              >
                {gridOption(grid).sizes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Start</span>
              <select
                className="select select-bordered select-sm"
                value={style}
                disabled={grid !== "square"}
                onChange={(event) =>
                  startNewGame(grid, size, parseStyle(event.target.value))
                }
              >
                {STYLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Difficulty</span>
              <select
                className="select select-bordered select-sm"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(parseDifficulty(event.target.value))
                }
              >
                {DIFFICULTIES.map((option) => (
                  <option key={option} value={option}>
                    {option[0]?.toUpperCase()}
                    {option.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => startNewGame(grid, size, style)}
            >
              New game
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function statusText(
  result: "human" | "computer" | "tie" | null,
  computerTurn: boolean,
): string {
  if (result === "human") return "You win! 🎉";
  if (result === "computer") return "Computer wins. Try again?";
  if (result === "tie") return "It's a tie.";
  return computerTurn
    ? "Computer is thinking…"
    : "Your turn — draw a line between two dots.";
}

function parseGrid(value: string): GridKind {
  return value === "triangular" || value === "hexagonal" ? value : "square";
}

function parseStyle(value: string): BoardStyle {
  return value === "swedish" || value === "icelandic" ? value : "american";
}

function parseDifficulty(value: string): Difficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

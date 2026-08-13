import { useEffect, useState } from "react";

import { requestMove } from "../lib/ai-client.ts";
import type { Difficulty } from "../lib/ai.ts";
import { applyMove, createGame, gameResult, isGameOver } from "../lib/game.ts";
import type { GameState, Player } from "../lib/game.ts";
import {
  isMuted,
  playClaim,
  playDraw,
  playLose,
  playWin,
  setMuted,
} from "../lib/sound.ts";
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
  const [soundOn, setSoundOn] = useState(() => !isMuted());

  const over = isGameOver(game);
  const computerTurn = !over && game.currentPlayer === "computer";
  const result = gameResult(game);

  // Win/lose stinger when a result is reached.
  useEffect(() => {
    if (result === "human") playWin();
    else if (result === "computer") playLose();
  }, [result]);

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
        playMoveSound(game, move, "computer");
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
    playMoveSound(game, edge, "human");
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
      <div className="card bg-base-100 border-base-300 relative w-full max-w-2xl border shadow-md">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 text-lg"
          aria-label={soundOn ? "Mute sound effects" : "Unmute sound effects"}
          onClick={() => {
            setMuted(soundOn);
            setSoundOn(!soundOn);
          }}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>

        <a
          href="https://github.com/sargunv/dots-and-boxes"
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          className="text-base-content/40 hover:text-base-content absolute right-3 bottom-3 transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4 fill-current"
            aria-hidden="true"
          >
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
        </a>
        <div className="card-body items-center gap-4">
          <h1 className="card-title font-display text-5xl">Dots and Boxes</h1>

          <div className="flex items-center gap-3">
            <span className="badge badge-primary badge-xl gap-1.5 px-4">
              You:{" "}
              <span key={game.scores.human} className="anim-score-pop">
                {game.scores.human}
              </span>
            </span>
            <span className="text-base-content/50 text-sm">vs</span>
            <span className="badge badge-secondary badge-xl gap-1.5 px-4">
              Computer:{" "}
              <span key={game.scores.computer} className="anim-score-pop">
                {game.scores.computer}
              </span>
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
            {result === null && computerTurn && (
              <span aria-hidden="true">
                <span className="anim-think">.</span>
                <span
                  className="anim-think"
                  style={{ animationDelay: "150ms" }}
                >
                  .
                </span>
                <span
                  className="anim-think"
                  style={{ animationDelay: "300ms" }}
                >
                  .
                </span>
              </span>
            )}
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
    ? "Computer is thinking"
    : "Your turn — draw a line between two dots.";
}

/** Pencil scratch for a plain move, stamp thump when it claims a cell. */
function playMoveSound(state: GameState, edge: number, player: Player): void {
  const next = applyMove(state, edge);
  if (next.scores[player] > state.scores[player]) playClaim();
  else playDraw();
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

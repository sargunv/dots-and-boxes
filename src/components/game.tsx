import { useEffect, useState } from "react";

import { requestMove } from "../lib/ai-client.ts";
import type { Difficulty } from "../lib/ai.ts";
import { applyMove, createGame, gameResult, isGameOver } from "../lib/game.ts";
import type { GameState } from "../lib/game.ts";
import { cx } from "../ui/cx.ts";
import { GameBoard } from "./game-board.tsx";

const BOARD_SIZES: readonly number[] = [2, 3, 4, 5];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const COMPUTER_MOVE_DELAY_MS = 450;

export function Game() {
  const [size, setSize] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [game, setGame] = useState<GameState>(() => createGame(3, 3));
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

  function startNewGame(nextSize: number) {
    setSize(nextSize);
    setGame(createGame(nextSize, nextSize));
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
              <span className="label-text mb-1">Board size</span>
              <select
                className="select select-bordered select-sm"
                value={size}
                onChange={(event) => startNewGame(Number(event.target.value))}
              >
                {BOARD_SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option} × {option}
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
              onClick={() => startNewGame(size)}
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

function parseDifficulty(value: string): Difficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

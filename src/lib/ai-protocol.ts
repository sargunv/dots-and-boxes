import type { Difficulty } from "./ai.ts";
import type { GameState, Player } from "./game.ts";

export interface MoveRequest {
  readonly id: number;
  readonly state: GameState;
  readonly difficulty: Difficulty;
}

export interface MoveResponse {
  readonly id: number;
  readonly move: number | null;
}

export function parseRequest(data: unknown): MoveRequest | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("id" in data) || typeof data.id !== "number") return null;
  if (!("difficulty" in data) || !isDifficulty(data.difficulty)) return null;
  if (!("state" in data) || !isGameState(data.state)) return null;
  return { id: data.id, state: data.state, difficulty: data.difficulty };
}

export function parseResponse(data: unknown): MoveResponse | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("id" in data) || typeof data.id !== "number") return null;
  if (
    !("move" in data) ||
    !(typeof data.move === "number" || data.move === null)
  ) {
    return null;
  }
  return { id: data.id, move: data.move };
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function isPlayer(value: unknown): value is Player {
  return value === "human" || value === "computer";
}

function isGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  return (
    "rows" in value &&
    typeof value.rows === "number" &&
    "cols" in value &&
    typeof value.cols === "number" &&
    "edges" in value &&
    Array.isArray(value.edges) &&
    "edgeOwners" in value &&
    Array.isArray(value.edgeOwners) &&
    "boxes" in value &&
    Array.isArray(value.boxes) &&
    "currentPlayer" in value &&
    isPlayer(value.currentPlayer) &&
    "scores" in value &&
    typeof value.scores === "object" &&
    value.scores !== null
  );
}

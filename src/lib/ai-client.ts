import { parseResponse } from "./ai-protocol.ts";
import type { MoveRequest } from "./ai-protocol.ts";
import type { Difficulty } from "./ai.ts";
import type { GameState } from "./game.ts";

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (move: number | null) => void>();

function getWorker(): Worker {
  if (worker === null) {
    worker = new Worker(new URL("./ai.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const response = parseResponse(event.data);
      if (response === null) return;
      const resolve = pending.get(response.id);
      if (resolve === undefined) return;
      pending.delete(response.id);
      resolve(response.move);
    };
  }
  return worker;
}

/**
 * Ask the AI worker for the computer's move without blocking the main
 * thread. Resolves `null` when there are no legal moves.
 */
export function requestMove(
  state: GameState,
  difficulty: Difficulty,
): Promise<number | null> {
  const request: MoveRequest = { id: nextId, state, difficulty };
  nextId += 1;
  return new Promise((resolve) => {
    pending.set(request.id, resolve);
    getWorker().postMessage(request);
  });
}

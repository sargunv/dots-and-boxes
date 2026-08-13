import { parseRequest } from "./ai-protocol.ts";
import type { MoveResponse } from "./ai-protocol.ts";
import { chooseMove } from "./ai.ts";

self.onmessage = (event: MessageEvent<unknown>) => {
  const request = parseRequest(event.data);
  if (request === null) return;
  const response: MoveResponse = {
    id: request.id,
    move: chooseMove(request.state, request.difficulty),
  };
  self.postMessage(response, {});
};

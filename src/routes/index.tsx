import { createFileRoute } from "@tanstack/react-router";

import { Game } from "../components/game.tsx";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <Game />;
}

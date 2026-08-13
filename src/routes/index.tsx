import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="card bg-base-100 border-base-300 w-full max-w-lg border">
        <div className="card-body">
          <h1 className="card-title text-2xl">Dots and Boxes</h1>
          <p className="text-base-content/70">
            A game of claiming lines and boxing in squares.
          </p>
        </div>
      </div>
    </main>
  );
}

import type { QueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return <Outlet />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="card bg-base-100 border-base-300 w-full max-w-md border">
        <div className="card-body items-center text-center">
          <h1 className="card-title">Page not found</h1>
          <p className="text-base-content/70 text-sm">
            The page you requested does not exist.
          </p>
          <Link to="/" className="btn btn-primary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

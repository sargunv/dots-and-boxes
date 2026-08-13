import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; local dev stays at /.
  base: process.env["BASE_PATH"] ?? "/",
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      addExtensions: true,
      routeTreeFileHeader: [
        "/* eslint-disable */",
        "// noinspection JSUnusedGlobalSymbols",
      ],
    }),
    react(),
    tailwindcss(),
  ],
  lint: {
    ignorePatterns: ["dist/**", "src/routeTree.gen.ts"],
    plugins: [
      "eslint",
      "typescript",
      "unicorn",
      "oxc",
      "import",
      "react",
      "promise",
      "vitest",
    ],
    rules: {
      "import/no-duplicates": "error",
      "import/no-self-import": "error",
      "import/no-empty-named-blocks": "error",
      "import/first": "error",
      "import/no-mutable-exports": "error",
      "import/no-cycle": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "typescript/no-explicit-any": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-type-assertion": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  server: {
    host: true,
    proxy: { "/api": "http://localhost:8080" },
  },
});

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "next.js",
          environment: "jsdom",
          include: [
            "**/__tests__/app/**/*.(ts|tsx|js|jsx)",
            "**/__tests__/components/**/*.(ts|tsx|js|jsx)",
            "**/__tests__/lib/**/*.(ts|tsx|js|jsx)",
            "**/__tests__/hooks/**/*.(ts|tsx|js|jsx)",
          ],
          setupFiles: ["./vitest.setup.ts"],
        },
        esbuild: {
          jsxInject: `import React from 'react'`,
        },
      },
      {
        extends: true,
        test: {
          name: "convex",
          environment: "edge-runtime",
          include: ["**/__tests__/convex/*.(ts|tsx|js|jsx)"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
    ],
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/convex/_generated/**",
      "**/__tests__/utils/test-wrapper.tsx", // ヘルパーファイルを除外
    ],
    alias: {
      "@": resolve(__dirname, "./"),
    },
    coverage: {
      provider: "v8",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "**/.next/**",
        "**/convex/_generated/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});

import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Configure module name mapping for path aliases
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Test directories
  testMatch: [
    "<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)",
    "<rootDir>/**/*.(test|spec).(ts|tsx|js|jsx)",
  ],
  // Ignore certain directories
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/convex/_generated/",
  ],
  // Transform ESM modules
  transformIgnorePatterns: [
    "node_modules/(?!(convex-test|convex|@testing-library)/)",
  ],
  // Enable ESM support
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  // Collect coverage from specific files
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "convex/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/convex/_generated/**",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
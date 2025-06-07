import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.(ts|tsx|js|jsx)',
      '**/*.(test|spec).(ts|tsx|js|jsx)',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/convex/_generated/**',
    ],
    alias: {
      '@': resolve(__dirname, './'),
    },
    coverage: {
      provider: 'v8',
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.next/**',
        '**/convex/_generated/**',
      ],
    },
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
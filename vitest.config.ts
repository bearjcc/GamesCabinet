import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts', 'src/games/**/*.ts', 'src/lib/**/*.ts'],
      exclude: [
        'server/index.ts',
        '**/*.test.ts',
        '**/*.tsx',
        'src/games/boards.ts',
        'src/lib/makeClient.ts',
        '**/__tests__/**',
        // Hogwarts Battle: large ported engine with its own Vitest suite (1300+ tests).
        // Kept out of the global 100% gate until Agency-driven deckbuilder kit owns more of it.
        'src/games/hogwarts-battle/**',
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      reporter: ['text', 'lcov'],
    },
  },
});

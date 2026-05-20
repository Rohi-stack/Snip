import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    // Run integration tests sequentially since they hit the same database
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
});

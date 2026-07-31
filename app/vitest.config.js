import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    // e2e/ holds Playwright specs, not Vitest ones — the two runners
    // otherwise fight over the same *.spec.js glob.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});

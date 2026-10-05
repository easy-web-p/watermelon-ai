import { defineConfig } from 'vitest/config';

/**
 * Vitest bundles its own Vite (rollup-based) while the app builds on Vite 8
 * (rolldown-based), so the two plugin types do not line up. Transforming JSX
 * with esbuild directly sidesteps that and keeps the test runner light.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

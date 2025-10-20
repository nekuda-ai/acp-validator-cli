import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/**/*.{ts,tsx}',
    'src/tests/**/*.test.ts',
    '!src/config/**/*.test.ts',
    '!src/commands/**/*.test.ts',
  ],
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  dts: true,
  shims: true,
  bundle: false, // Changed to false to preserve directory structure for tests
  external: [
    '@vitest/browser',
    '@vitest/ui',
    'lightningcss',
  ],
});

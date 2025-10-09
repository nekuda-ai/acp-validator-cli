import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  dts: true,
  shims: true,
  bundle: true,
  external: [
    '@vitest/browser',
    '@vitest/ui',
    'lightningcss',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
});

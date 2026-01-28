import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node24',
  outDir: 'dist',
  external: ['node-appwrite', '@sveltejs/kit'],
});

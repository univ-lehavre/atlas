import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/effect.ts'],
  external: ['effect'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node24',
  outDir: 'dist',
});

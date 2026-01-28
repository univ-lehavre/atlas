import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/auth.ts', 'src/base.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node24',
  outDir: 'dist',
});

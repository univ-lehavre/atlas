import { mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Extend vite.config.ts to add the json coverage reporter required by
// coverage-report.mjs (which reads coverage/coverage-final.json).
export default mergeConfig(viteConfig, {
  test: {
    coverage: {
      reporter: process.env.CI ? ['text', 'json'] : ['text', 'html', 'lcov', 'json'],
    },
  },
});

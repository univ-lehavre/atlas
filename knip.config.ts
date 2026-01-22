import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  workspaces: {
    '.': {},
    'apps/*': {
      entry: ['src/**/*.ts'],
      ignore: ['**/*.test.ts', '**/*.spec.ts'],
    },
    'packages/redcap-api': {
      entry: ['src/**/*.ts'],
      ignore: ['**/*.test.ts', '**/*.spec.ts'],
    },
    'packages/eslint-config': {
      entry: ['*.js'],
    },
    'packages/typescript-config': {
      entry: ['*.json'],
    },
  },
};

export default config;

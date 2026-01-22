import baseConfig from '@univ-lehavre/atlas-eslint-config/base';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,
  {
    ignores: [
      '**/tools/**',
      '**/scripts/**',
      '*.config.ts',
      '*.config.js',
      '**/*.config.ts',
      '**/*.config.js',
      'packages/eslint-config/**',
      'packages/typescript-config/**',
      'packages/redcap-cli/**',
      // TODO: Configure eslint-plugin-svelte for ecrin
      'apps/ecrin/**',
    ],
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['*.config.js', '*.config.ts'],
    rules: {
      'barrel-files/avoid-barrel-files': 'off',
    },
  }
);

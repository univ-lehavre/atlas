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
      'packages/eslint-config/**',
      'packages/typescript-config/**',
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

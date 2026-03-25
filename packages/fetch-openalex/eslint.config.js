import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({ ignores: ['**/*.test.ts', '**/*.spec.ts'], tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/helpers.ts', 'src/index.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];

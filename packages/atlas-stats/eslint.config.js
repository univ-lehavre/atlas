import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/**/*.ts'],
    rules: {
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-let': 'off',
      'functional/no-loop-statements': 'off',
      'functional/immutable-data': 'off',
      'functional/no-try-statements': 'off',
      'unicorn/no-negated-condition': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
];

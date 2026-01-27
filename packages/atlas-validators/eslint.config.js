import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({}),
  // Disable strict functional rules for this imperative utility package
  {
    files: ['src/**/*.ts'],
    rules: {
      'functional/no-throw-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      // Email regex is RFC 5322 compliant and intentionally uses character classes
      'regexp/use-ignore-case': 'off',
      'regexp/prefer-w': 'off',
      'regexp/prefer-d': 'off',
      'regexp/optimal-quantifier-concatenation': 'off',
      'security/detect-unsafe-regex': 'off', // Email regex is ReDoS-safe by design
    },
  },
];

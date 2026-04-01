import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    workspaceModules: [
      '@univ-lehavre/atlas-redcap-client',
      '@univ-lehavre/atlas-fetch-openalex',
      '@univ-lehavre/atlas-openalex-types',
    ],
  }),
  // PDFKit uses an imperative/stateful API — relax functional rules for this file
  {
    files: ['src/services/pdf-generator.ts'],
    rules: {
      'functional/no-expression-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/immutable-data': 'off',
      'functional/no-loop-statements': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  // utils.ts uses imperative date manipulation
  {
    files: ['src/utils.ts'],
    rules: {
      'functional/no-expression-statements': 'off',
      'functional/no-conditional-statements': 'off',
    },
  },
];

import { typescript } from '@univ-lehavre/atlas-typescript-config/eslint';

export default typescript({
  ignores: ['**/generated/**'],
  workspaceModules: ['@univ-lehavre/atlas-net'],
});

import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default typescript({
  ignores: ['**/generated/**'],
  workspaceModules: ['@univ-lehavre/atlas-net'],
});

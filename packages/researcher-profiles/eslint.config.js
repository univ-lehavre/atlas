import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default typescript({
  tsconfigRootDir: import.meta.dirname,
  workspaceModules: [
    '@univ-lehavre/atlas-crf',
    '@univ-lehavre/atlas-fetch-openalex',
    '@univ-lehavre/atlas-openalex-types',
  ],
});

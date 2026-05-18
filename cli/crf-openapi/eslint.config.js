import { scripts } from '@univ-lehavre/atlas-shared-config/eslint';

// Note: src/core/ contains pure functions designed for future functional refactoring.
// Currently using scripts preset for the whole package.
export default scripts({
  ignores: ['specs/**', 'upstream/**'],
});

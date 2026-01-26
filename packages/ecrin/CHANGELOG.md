# ecrin

## 0.0.2
### Patch Changes



- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`b7eca34`](https://github.com/univ-lehavre/atlas/commit/b7eca34866bb51e601bd98777e8230f0b448d796) Thanks [@chasset](https://github.com/chasset)! - fix(ecrin): resolve typescript errors blocking pre-commit
  
  - Add `export {}` to app.d.ts for proper module treatment
  - Rename Record interface to RedcapRecord to avoid shadowing global Record<K,V>
  - Add prettier-plugin-svelte for .svelte file formatting
  - Add app.d.ts to .prettierignore (prettier removes export {})
  - Fix lefthook: run svelte-kit sync before lint for tsconfig resolution


- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`c5a5a55`](https://github.com/univ-lehavre/atlas/commit/c5a5a5536bb40425ee0f8dcc2e1ae5ee9ed2fff2) Thanks [@chasset](https://github.com/chasset)! - Migrate ESLint and Prettier to per-package configuration
  
  - Move ESLint config from root to each package/app with full rule set
  - Move Prettier config from root to each package/app
  - Update lefthook to use turbo tasks instead of direct eslint/prettier calls
  - Remove eslint and prettier from root devDependencies
  - Each package now has its own `.prettierrc`, `.prettierignore`, and `eslint.config.js`

---
'@univ-lehavre/atlas-crf': patch
'@univ-lehavre/atlas-net': patch
'@univ-lehavre/atlas-redcap': patch
'ecrin': patch
---

Migrate ESLint and Prettier to per-package configuration

- Move ESLint config from root to each package/app with full rule set
- Move Prettier config from root to each package/app
- Update lefthook to use turbo tasks instead of direct eslint/prettier calls
- Remove eslint and prettier from root devDependencies
- Each package now has its own `.prettierrc`, `.prettierignore`, and `eslint.config.js`

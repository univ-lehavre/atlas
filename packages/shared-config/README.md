# @univ-lehavre/atlas-shared-config

Shared TypeScript and ESLint configuration for Atlas projects.

## Installation

```bash
pnpm add -D @univ-lehavre/atlas-shared-config
```

## TypeScript Configuration

| Config      | Description                              |
| ----------- | ---------------------------------------- |
| `base.json` | Base strict configuration                |
| `node.json` | Node.js specific settings (extends base) |

### Usage

```json
// tsconfig.json
{
  "extends": "@univ-lehavre/atlas-shared-config/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### base.json

Strict TypeScript configuration:

| Option                               | Value  | Description                                   |
| ------------------------------------ | ------ | --------------------------------------------- |
| `strict`                             | `true` | Enable all strict checks                      |
| `noUncheckedIndexedAccess`           | `true` | Add `undefined` to indexed access             |
| `noImplicitOverride`                 | `true` | Require `override` keyword                    |
| `noPropertyAccessFromIndexSignature` | `true` | Require bracket notation for index signatures |
| `noFallthroughCasesInSwitch`         | `true` | Report fallthrough in switch                  |
| `forceConsistentCasingInFileNames`   | `true` | Enforce consistent file casing                |
| `verbatimModuleSyntax`               | `true` | Enforce explicit type imports                 |
| `isolatedModules`                    | `true` | Ensure compatibility with transpilers         |

### node.json

Extends `base.json` with Node.js-specific settings:

| Option             | Value        | Description               |
| ------------------ | ------------ | ------------------------- |
| `module`           | `NodeNext`   | Node.js ESM module system |
| `moduleResolution` | `NodeNext`   | Node.js module resolution |
| `target`           | `ES2024`     | ECMAScript 2024 target    |
| `lib`              | `["ES2024"]` | ES2024 library            |

## ESLint Configuration

Three presets for different use cases:

| Preset       | Use Case                        | Strictness |
| ------------ | ------------------------------- | ---------- |
| `typescript` | TypeScript libraries (crf, net) | Strict     |
| `svelte`     | SvelteKit applications (ecrin)  | Strict     |
| `scripts`    | Internal tooling (redcap)       | Relaxed    |

### Usage

```javascript
// eslint.config.js
import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default typescript({
  ignores: ['**/generated/**'],
  workspaceModules: ['@univ-lehavre/atlas-net'],
});
```

### Preset Comparison

#### Common Plugins (all presets)

- `@eslint/js` - ESLint recommended rules
- `typescript-eslint` - TypeScript support
- `eslint-config-prettier` - Prettier compatibility

#### typescript

Strict configuration for TypeScript library packages.

**Additional plugins:**
- `eslint-plugin-functional` - Functional programming rules (adapted for Effect)
- `eslint-plugin-unicorn` - Modern best practices
- `eslint-plugin-n` - Node.js rules
- `eslint-plugin-import-x` - Import/export rules
- `eslint-plugin-security` - Security rules
- `eslint-plugin-regexp` - RegExp rules
- `eslint-plugin-no-secrets` - Prevent secrets in code
- `eslint-plugin-barrel-files` - Discourage barrel files
- `eslint-plugin-turbo` - Turborepo rules
- `@vitest/eslint-plugin` - Vitest rules

**Key rules:**
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/strict-boolean-expressions`: error
- `@typescript-eslint/explicit-function-return-type`: error
- `functional/no-throw-statements`: error
- `functional/no-try-statements`: error
- `functional/immutable-data`: error (with exceptions)

**Relaxed for:**
- Test files (`*.test.ts`, `*.spec.ts`)
- CLI/bin files
- Server entry points

#### svelte

Strict configuration for SvelteKit applications. Extends `typescript` with Svelte-specific rules.

**Additional plugins:**
- `eslint-plugin-svelte` - Svelte rules

**Svelte-specific rules:**
- `svelte/valid-compile`: error
- `svelte/no-at-html-tags`: warn
- `svelte/require-each-key`: warn
- `svelte/no-reactive-functions`: error
- `svelte/no-reactive-literals`: error

**Disabled for `.svelte` files:**
- `functional/*` rules (Svelte uses imperative patterns)
- `@typescript-eslint/explicit-function-return-type`
- `prefer-const` (Svelte 5 `$props()` uses `let`)

**Disabled globally:**
- `n/no-missing-import` (SvelteKit virtual modules: `$app/*`, `$env/*`, `$lib`)
- `import-x/no-cycle` (Svelte component cycles are normal)

**Relaxed for:**
- Server files (`*.server.ts`, `hooks.server.ts`, `src/lib/server/**`)
- Route files (`src/routes/**/*.ts`)

#### scripts

Relaxed configuration for internal tooling and scripts.

**Plugins:**
- `@eslint/js` - ESLint recommended (not strict)
- `typescript-eslint` - Recommended (not strict type-checked)
- `@vitest/eslint-plugin` - Vitest rules
- `eslint-config-prettier` - Prettier compatibility

**Key differences from `typescript`:**
- No functional programming rules
- No security rules
- No import rules
- `@typescript-eslint/no-explicit-any`: warn (not error)
- `@typescript-eslint/no-unused-vars`: warn (not error)
- `no-console`: off

### Options

All presets accept an options object:

```typescript
interface Options {
  ignores?: string[];        // Additional patterns to ignore
  workspaceModules?: string[]; // Workspace modules for n/no-missing-import (typescript only)
}
```

## License

MIT

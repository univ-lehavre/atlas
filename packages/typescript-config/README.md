# @univ-lehavre/atlas-typescript-config

Shared TypeScript configuration for Atlas projects.

## Installation

```bash
pnpm add -D @univ-lehavre/atlas-typescript-config
```

## Available Configurations

| Config      | Description                              |
| ----------- | ---------------------------------------- |
| `base.json` | Base strict configuration                |
| `node.json` | Node.js specific settings (extends base) |

## Usage

```json
// tsconfig.json
{
  "extends": "@univ-lehavre/atlas-typescript-config/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

## Configuration Details

### base.json

Strict TypeScript configuration with the following options:

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

## License

MIT

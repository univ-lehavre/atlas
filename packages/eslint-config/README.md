# @univ-lehavre/atlas-eslint-config

Shared ESLint configuration for Atlas projects, optimized for TypeScript and functional programming with [Effect](https://effect.website/).

## Installation

```bash
pnpm add -D @univ-lehavre/atlas-eslint-config
```

## Usage

```javascript
// eslint.config.js
import base from '@univ-lehavre/atlas-eslint-config/base';

export default [...base];
```

## Features

### TypeScript Strict Mode

Based on `tseslint.configs.strictTypeChecked`:

- `strict-boolean-expressions` - No implicit boolean coercion
- `no-floating-promises` - All promises must be handled
- `no-explicit-any` - Forbids `any` type
- `consistent-type-imports` - Forces `import type` syntax
- `switch-exhaustiveness-check` - All cases must be covered

### Functional Programming

Based on [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional):

- `no-expression-statements` - No side effects without return
- `no-conditional-statements` - Forces ternaries/pattern matching
- `no-throw-statements` - Use Effect instead of throw
- `no-try-statements` - Use Effect instead of try/catch
- `immutable-data` - No object/array mutation

### Security

Based on [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security):

- `detect-unsafe-regex` - Detects ReDoS-vulnerable regex
- `detect-eval-with-expression` - Forbids eval with expressions
- `detect-object-injection` - Warns on dynamic property access

### Code Quality

| Rule                     | Value | Description                              |
| ------------------------ | ----- | ---------------------------------------- |
| `max-depth`              | 4     | Maximum nesting depth                    |
| `max-lines-per-function` | 60    | Maximum lines per function               |
| `complexity`             | 15    | Maximum cyclomatic complexity            |
| `no-console`             | error | Forbids console.log (allows warn, error) |

### Effect.js Patterns

The following patterns are automatically allowed:

```javascript
Effect.runPromise(...)
pipe(value, Effect.map(...))
Layer.succeed(...)
app.get('/path', handler)
```

### Test Files

Strict rules are disabled for `*.test.ts` and `*.spec.ts` files.

## License

MIT

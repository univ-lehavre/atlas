# @univ-lehavre/atlas-cli-toolkit

Boilerplate partagé, agnostique du framework, pour les CLIs du monorepo atlas.

Le périmètre est volontairement étroit et sans politique d'I/O : lecture
d'environnement, parsing de flags `argv` et gestion erreur fatale / code de
sortie. Le rendu terminal (`@clack/prompts`, couleurs) et les frameworks
d'arguments (`yargs`) restent dans chaque CLI : ils ne peuvent pas vivre dans
`packages/` (cf. audit de structure du workspace).

## Utilisation

### Lecture d'environnement

```ts
import { getEnv, requireEnv } from '@univ-lehavre/atlas-cli-toolkit';

const userAgent = getEnv('OPENALEX_USER_AGENT', 'atlas/1.0.0');

const env = requireEnv(['REDCAP_API_URL', 'REDCAP_API_TOKEN']);
if (!env.ok) {
  log.error(`Missing required environment variables: ${env.missing.join(', ')}`);
  process.exit(1);
}
const { REDCAP_API_URL, REDCAP_API_TOKEN } = env.values;
```

### Parsing de flags

```ts
import { hasFlag, getFlagValue, findUnknownFlags } from '@univ-lehavre/atlas-cli-toolkit';

const args = process.argv.slice(3);
const batch = hasFlag(args, '--batch', '--yes');
const threshold = getFlagValue(args, '--threshold');
const unknown = findUnknownFlags(args, {
  booleanFlags: ['--batch', '--yes'],
  valueFlags: ['--threshold'],
});
if (unknown.length > 0) {
  log.error(`Unknown option(s): ${unknown.join(', ')}`);
  process.exit(1);
}
```

### Erreur fatale / code de sortie

```ts
#!/usr/bin/env node
import { runMain } from '@univ-lehavre/atlas-cli-toolkit';
import { main } from '../commands/index.js';

runMain(main); // main() rejette → "Fatal error:" + process.exit(1)
```

## API

- `getEnv(name, fallback?)` — lit une variable d'environnement (vide ⇒ fallback).
- `requireEnv(names)` — `{ ok: true, values }` ou `{ ok: false, missing }`.
- `hasFlag(args, ...names)` — présence d'un flag booléen (ou de l'un de ses alias).
- `getFlagValue(args, name)` — valeur suivant un flag (`--threshold 0.3` → `"0.3"`).
- `findUnknownFlags(args, { booleanFlags, valueFlags })` — flags non reconnus.
- `runMain(main, { exitCode?, onError? })` — exécute un `main` async, reporte et sort.
- `clearScreen()` — réinitialise l'écran du terminal (séquence ANSI `ESC c`).

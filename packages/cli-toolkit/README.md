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

### Amorçage Effect (`./effect`)

Pour les CLIs écrites en [Effect](https://effect.website/), le sous-chemin
`@univ-lehavre/atlas-cli-toolkit/effect` expose `runEffectCli` : l'amorçage
**unique** (écart E11, [ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
Il exécute le programme CLI sur un runtime central qui silencie le logger (les
CLIs dessinent leur propre UI) et fournit `NodeContext`, et mappe un `ExitCode`
en échec vers `process.exitCode`. Remplace les `NodeRuntime.runMain` /
`Effect.runPromiseExit` / runners ad hoc par CLI.

Ce sous-chemin tire `effect` ; l'import par défaut (env/flags/`runMain`) reste,
lui, **sans** `effect` (peer optionnel).

```ts
// bin/atlas-foo.ts
import { runEffectCli } from '@univ-lehavre/atlas-cli-toolkit/effect';
import { program } from '../commands/index.js';

await runEffectCli(program); // ExitCode numérique → process.exitCode ; sinon fallback (1)
```

## API

- `getEnv(name, fallback?)` — lit une variable d'environnement (vide ⇒ fallback).
- `requireEnv(names)` — `{ ok: true, values }` ou `{ ok: false, missing }`.
- `hasFlag(args, ...names)` — présence d'un flag booléen (ou de l'un de ses alias).
- `getFlagValue(args, name)` — valeur suivant un flag (`--threshold 0.3` → `"0.3"`).
- `findUnknownFlags(args, { booleanFlags, valueFlags })` — flags non reconnus.
- `runMain(main, { exitCode?, onError? })` — exécute un `main` async non-Effect, reporte et sort.
- `clearScreen()` — réinitialise l'écran du terminal (séquence ANSI `ESC c`).
- `runEffectCli(program, { fallbackExitCode? })` (sous-chemin `./effect`) —
  amorçage Effect sur le runtime central.
- `quiet(program)` (sous-chemin `./effect`, **déprécié**) — silence le logger
  Effect ; `runEffectCli` le fait déjà.

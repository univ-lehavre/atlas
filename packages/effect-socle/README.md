# @univ-lehavre/atlas-effect-socle

Socle d'exécution Effect partagé du monorepo atlas : le **runtime central**
(`ManagedRuntime` + `AppLayer`) et le **logger configurable**, mutualisés entre
les services et les CLIs.

Met en œuvre les décisions de cadrage du socle Effect — voir
[ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)
(runtime central par type de processus) et l'écart E8 (logger configuré une fois
au runtime).

## Runtime

Chaque processus (service HTTP, CLI, serveur SvelteKit) construit **un** runtime
au démarrage à partir de son `AppLayer`, et toute exécution passe par lui.

```ts
import { makeRuntimeWithShutdown } from '@univ-lehavre/atlas-effect-socle';

// Au point d'entrée du processus, une seule fois :
const runtime = makeRuntimeWithShutdown(AppLayer);
// runtime.runPromise(effect) / runtime.runSync(effect)
// SIGTERM/SIGINT disposent le runtime (finalizers des Layer).
```

- `makeRuntime(appLayer)` — runtime sans gestion de signaux (CLIs courts, tests).
- `makeRuntimeWithShutdown(appLayer, register?)` — runtime + handlers
  `SIGTERM`/`SIGINT` qui le disposent (serveurs longue durée). `register` est
  injectable pour les tests.

## Logger

Remplace les `quiet()` / `withMinimumLogLevel(None)` ré-appliqués à chaque
frontière par **un** layer monté dans l'`AppLayer`.

```ts
import { makeLoggerLayer, QuietLoggerLayer } from '@univ-lehavre/atlas-effect-socle';

// Niveau lu depuis LOG_LEVEL au boot (12-factor, ADR 0045) :
const LoggerLayer = makeLoggerLayer();
// Niveau fixe (CLI silencieux, tests) :
const fixed = makeLoggerLayer(LogLevel.Warning);
// Silence total (remplace l'ancien quiet()) :
QuietLoggerLayer;
```

`LOG_LEVEL` accepte (insensible à la casse) :
`all`, `trace`, `debug`, `info` (défaut), `warning`/`warn`, `error`, `fatal`,
`none`/`silent`. Une valeur inconnue retombe sur `info`.

## API

- `makeRuntime(appLayer)`, `makeRuntimeWithShutdown(appLayer, register?)`,
  type `AppRuntime<R, E>`.
- `makeLoggerLayer(level?)`, `QuietLoggerLayer`, `parseLogLevel(raw)`,
  `LogLevelConfig`, `DEFAULT_LOG_LEVEL`.

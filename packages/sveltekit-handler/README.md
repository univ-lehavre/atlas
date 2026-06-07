# @univ-lehavre/atlas-sveltekit-handler

Wrapper partagé pour les handlers SvelteKit `+server.ts` du monorepo atlas.

`withHandler` factorise le boilerplate try/catch + mapping d'erreur. Il
n'impose pas la forme de la réponse de succès : la fonction interne
peut soit renvoyer une `Response` (PDF binaire, headers custom…), soit
une valeur quelconque qui sera sérialisée via `Response.json`.

## Utilisation

```ts
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { downloadSurvey } from '$lib/server/services/surveys';

export const GET = withHandler(async ({ locals, fetch }) => {
  const id = locals.userId;
  if (!id) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');
  const result = await downloadSurvey(id, { fetch });
  return { data: result, error: null };
});
```

### Forme `{ code, message }` plate (find-an-expert)

Passer un `mapError` custom :

```ts
const flatMapper = (error: unknown) => {
  if (error instanceof ApplicationError) {
    return { body: { code: error.code, message: error.message }, status: error.httpStatus };
  }
  return { body: { code: 'unexpected_error', message: 'Unknown error' }, status: 500 };
};
export const GET = withHandler(handler, { mapError: flatMapper });
```

## Adaptateur Effect (`./effect`)

Pour le code métier écrit en [Effect](https://effect.website/), le sous-chemin
`@univ-lehavre/atlas-sveltekit-handler/effect` expose `runEffectHandler` :
symétrique de `runEffect` du service CRF, il exécute un `Effect<A, E>` retourné
par `lib/server/*` et traduit les `Data.TaggedError` en statut HTTP **avant**
`runPromise` — l'erreur typée ne s'aplatit plus en `500` opaque.

Le sous-chemin tire `effect` ; il est **réservé au serveur** (jamais importé
depuis un composant `.svelte` ou un module client, sous peine d'entraîner `effect`
dans le bundle client). L'import par défaut (`withHandler`) reste, lui, **sans**
`effect`.

```ts
// +server.ts
import { runEffectHandler } from '@univ-lehavre/atlas-sveltekit-handler/effect';
import { Match } from 'effect';
import { searchInstitutions } from '$lib/server/citation';

export const GET = ({ url }) =>
  runEffectHandler(searchInstitutions(url.searchParams.get('q') ?? ''), {
    mapError: (e) =>
      Match.value(e).pipe(
        Match.tag('StatusError', (se) => ({
          body: { code: 'upstream_error', message: se.message },
          status: 502,
        })),
        Match.orElse(() => ({
          body: { code: 'internal_error', message: 'Unknown error' },
          status: 500,
        }))
      ),
  });
```

Voir [ADR 0046](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0046-frontiere-effect-sveltekit.md)
et [ADR 0048](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0048-modele-erreur-http.md).

## API

- `withHandler(fn, options?)` — wrappe une fonction async en `RequestHandler`.
- `ErrorMapper` — type de la stratégie de mapping d'erreur.
- `WithHandlerOptions` — `mapError`, `headers`, `successStatus`.
- `runEffectHandler(effect, options?)` (sous-chemin `./effect`) — exécute un
  `Effect<A, E>` et renvoie une `Response`, mapping erreur typée → statut.
- `EffectErrorMapper<E>`, `RunEffectOptions<E>` (sous-chemin `./effect`).

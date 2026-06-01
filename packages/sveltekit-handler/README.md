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

## API

- `withHandler(fn, options?)` — wrappe une fonction async en `RequestHandler`.
- `ErrorMapper` — type de la stratégie de mapping d'erreur.
- `WithHandlerOptions` — `mapError`, `headers`, `successStatus`.

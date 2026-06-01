// Re-export les erreurs consommées via `$lib/errors` : `SessionError`
// (hooks.server.ts) et `NotAnEmailError` (tests du validator signup).
// Les endpoints qui lèvent `ApplicationError` l'importent directement
// depuis `@univ-lehavre/atlas-errors`.
export { SessionError, NotAnEmailError } from '@univ-lehavre/atlas-errors';

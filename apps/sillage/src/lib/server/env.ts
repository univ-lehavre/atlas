/**
 * Lecture **à l'exécution** des secrets serveur, via `$env/dynamic/private`.
 *
 * Pourquoi pas `$env/static/private` : `static/private` fige la valeur **au
 * build** (elle est inlinée dans le bundle serveur compilé). Une image Docker
 * construite ainsi embarque un placeholder figé et ne peut pas recevoir le vrai
 * secret au runtime — l'image n'est pas déployable (ADR 0033 : « aucun secret
 * ne transite par un ARG/ENV du builder ; les variables privées sont lues à
 * l'exécution »). `dynamic/private` lit `process.env` au runtime de l'adapter
 * Node, ce qui rend l'image déployable.
 *
 * Pourquoi des **getters mémoïsés** plutôt que des `const` validées à l'import :
 * late-binding 12-factor strict (ADR 0045). La valeur est lue et validée au
 * **premier appel**, pas à l'import du module — donc importer ce module ne fige
 * rien et ne plante jamais. Le secret manquant échoue tôt et **clairement**
 * (throw au premier usage réel), au lieu d'une dégradation silencieuse
 * (`undefined` coercé en `"undefined"` dans une URL/un token, etc.).
 *
 * Ce module DOIT rester sous `src/lib/server/` : SvelteKit garantit qu'il ne fuit
 * jamais vers le bundle client.
 */

import { env } from '$env/dynamic/private';

/** Cache des valeurs déjà résolues (mémoïsation : une lecture/validation par clé). */
const cache = new Map<string, string>();

/**
 * Lit une variable d'environnement **requise**, la valide une fois et la mémoïse.
 * Fail-closed : un secret absent ou vide fait échouer le premier appel avec un
 * message explicite, plutôt que de laisser fuiter un `undefined`.
 */
const required = (name: string): string => {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const value = env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement requise absente ou vide : ${name}. ` +
        `Elle doit être fournie au runtime (cf. $env/dynamic/private).`
    );
  }
  cache.set(name, value);
  return value;
};

/** Jeton d'API REDCap (secret) pour l'export d'enregistrements. */
export const redcapApiToken = (): string => required('REDCAP_API_TOKEN');

/** Clé API serveur Appwrite (secret admin). */
export const appwriteKey = (): string => required('APPWRITE_KEY');

/** Regex de validation des domaines d'e-mail autorisés (requise par atlas-auth). */
export const allowedDomainsRegexp = (): string => required('ALLOWED_DOMAINS_REGEXP');

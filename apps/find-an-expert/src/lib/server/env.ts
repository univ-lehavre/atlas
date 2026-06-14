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
 * late-binding 12-factor strict (ADR 0045, déjà appliqué dans `citation/index.ts`).
 * La valeur est lue et validée au **premier appel**, pas à l'import du module —
 * donc importer ce module ne fige rien et ne plante jamais (utile pour les tests
 * qui importent sans fournir tous les secrets). Le secret manquant échoue tôt et
 * **clairement** (throw au premier usage réel), au lieu d'une dégradation
 * silencieuse (`undefined` coercé en `"undefined"` dans une URL, etc.).
 *
 * Forme : `$env/dynamic/private` expose `env: Record<string, string | undefined>`.
 * On absorbe ce `string | undefined` **ici, une seule fois**, et on ré-expose des
 * `string` garanties (secrets requis) ou des `string | undefined` explicites
 * (variables optionnelles). Le code consommateur appelle `appwriteKey()` au lieu
 * de lire la const `APPWRITE_KEY`, mais ne manipule jamais d'`undefined` inattendu.
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

// --- Appwrite (BaaS) : secrets requis ---------------------------------------

/** Endpoint de l'instance Appwrite (ex. `https://cloud.example.com/v1`). */
export const appwriteEndpoint = (): string => required('APPWRITE_ENDPOINT');

/** Identifiant du projet Appwrite. */
export const appwriteProject = (): string => required('APPWRITE_PROJECT');

/** Clé API serveur Appwrite (secret admin). */
export const appwriteKey = (): string => required('APPWRITE_KEY');

/** Identifiant de la base de données Appwrite. */
export const appwriteDatabaseId = (): string => required('APPWRITE_DATABASE_ID');

/** Collection des événements de consentement (journal immuable). */
export const appwriteConsentEventsCollectionId = (): string =>
  required('APPWRITE_CONSENT_EVENTS_COLLECTION_ID');

/** Collection de l'état courant des consentements. */
export const appwriteCurrentConsentsCollectionId = (): string =>
  required('APPWRITE_CURRENT_CONSENTS_COLLECTION_ID');

// --- Validation de domaine : secret requis ----------------------------------

/** Regex de validation des domaines d'e-mail autorisés (requise par atlas-auth). */
export const allowedDomainsRegexp = (): string => required('ALLOWED_DOMAINS_REGEXP');

// --- OpenAlex : variable optionnelle ----------------------------------------

/**
 * Jeton d'API OpenAlex, **optionnel** (l'accès anonyme reste possible). Renvoie
 * `undefined` si absent ou vide — le consommateur (`citation/index.ts`) tolère
 * déjà ce cas (`apiKey: ... || undefined`).
 */
export const openalexApiToken = (): string | undefined => env.OPENALEX_API_TOKEN || undefined;

# 0020 — Lint Svelte au preset strict

## Contexte

Le shared-config exporte deux presets ESLint pour SvelteKit :
`svelteRelaxed` (recommended + relaxations TypeScript) et `svelte`
(strict type-checked + functional + durcissement sécurité). Jusqu'à
maintenant, les 7 paquets Svelte du monorepo (6 apps + `ui/atlas-ui`)
utilisaient `svelteRelaxed`. Le préset relaxed désactive en bloc
`@typescript-eslint/no-unsafe-*` et n'active ni `functional/*`, ni
`unicorn/*`, ni `security/*` ; il manque donc le filet qui catche
côté apps les défauts que le préset TypeScript catche déjà côté
packages/cli.

Côté DevSecOps, l'écart est particulièrement gênant : les composants
Svelte ne sont pas couverts par CodeQL (l'extracteur JS/TS ignore les
blocs `<script>` Svelte), or le préset strict ajoute justement les
règles `svelte/no-at-html-tags`, `svelte/no-target-blank`,
`svelte/no-dom-manipulating` et `svelte/no-svelte-internal` qui sont
nos seules garanties XSS/supply-chain sur ces fichiers.

## Décision

Les 7 paquets Svelte importent désormais le préset `svelte` (strict)
depuis `@univ-lehavre/atlas-shared-config/eslint/svelte` :

- `apps/amarre`
- `apps/atlas-dashboard`
- `apps/crf-dashboard`
- `apps/ecrin`
- `apps/find-an-expert`
- `apps/sillage`
- `ui/atlas-ui`

Le préset `svelteRelaxed` est conservé (back-compat) mais n'est plus
utilisé en interne. Tout nouveau paquet Svelte démarre directement sur
`svelte`.

### Ajustements communs portés dans le préset `svelte`

Pour rendre la migration soutenable sans baisser la barre globale, le
préset lui-même a été ajusté :

- **Tests** : ajout d'un override `**/*.test.ts` / `**/*.spec.ts` /
  `**/tests/**/*.ts` qui désactive les règles type-checked et
  `functional/*`. Vitest est imperatif par design (`expect(...)`,
  `describe(...)`), ces règles ajoutent du bruit sans valeur sur du
  code d'assertion. Aligné sur le préset `typescript`.
- **Fichiers `.svelte.ts` / `.svelte.js`** : ajoutés à la section
  Svelte (parser et globals navigateur). Le préset ne les traitait
  pas, ce qui produisait des erreurs de parsing TS.
- **Composants `.svelte`** : désactivation de `functional/no-return-void`
  (les handlers `onclick` Svelte 5 sont void par contrat),
  `functional/no-throw-statements` (`throw error(...)` dans `load()`
  est idiomatique SvelteKit), `@typescript-eslint/no-confusing-void-expression`,
  `@typescript-eslint/no-non-null-assertion` (sur `page.data`),
  `unicorn/filename-case` (composants en PascalCase par convention).

### Dérogations paquet par paquet

Chaque `eslint.config.js` documente ses dérogations avec un compteur
d'occurrences et un TODO si refactor prévu. Synthèse :

| Paquet                 | Findings strict initiaux | Désactivations principales (raison)                                                                                                                                                                                        |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/amarre`          | 292 → 0                  | `no-unsafe-*`, `no-base-to-string`, `no-deprecated`, `unified-signatures`, `filename-case` (code legacy server/services). `scripts/**` ignoré (hors projectService).                                                       |
| `apps/atlas-dashboard` | 27 → 0                   | `EventSource` + `onmessage/onerror` (SSE navigateur, faux positifs Node/unicorn), `svelte/button-has-type` (TODO a11y), `no-unnecessary-condition` (narrowing TS partiel).                                                 |
| `apps/crf-dashboard`   | 55 → 0                   | `security/detect-object-injection` (clés contrôlées), `detect-non-literal-fs-filename` (lecture logs), SSE handlers (loops, max-lines), `no-mixed-types` (+server.ts), `button-has-type` (TODO a11y).                      |
| `apps/ecrin`           | 176 → 0                  | Large dérogation `functional/*` + `no-unsafe-*` + `strict-boolean-expressions` (code formulaire Svelte 5 dense). `svelte/valid-compile` désactivé (2 cas `state_referenced_locally` à refactorer). `test-utils/**` ignoré. |
| `apps/find-an-expert`  | 348 → 0                  | `security/detect-object-injection` (44 occ., mappings publications), `no-deprecated` (ZodTypeAny), `no-secrets/no-secrets` (URLs Google Fonts à entropie élevée), `unicorn/prefer-global-this` (contexte browser).         |
| `apps/sillage`         | 36 → 0                   | `restrict-template-expressions`, `functional/{no-loop,no-conditional,immutable-data}` (Fisher–Yates), `no-array-sort` (tests), `no-empty-function` (mocks).                                                                |
| `ui/atlas-ui`          | 184 → 0                  | `no-unsafe-*` (67 occ., `page.data` typé large), `unicorn/filename-case` (19 stories en PascalCase, convention Storybook), beaucoup de stylistiques unicorn (`prefer-spread`, `prefer-query-selector`, …).                 |

### Effets de bord en dehors du périmètre

Le préset `base` activait déjà
`@eslint-community/eslint-comments/require-description` ; cette règle
faisait défaut sur 18 directives `eslint-disable*` non-commentées dans
9 paquets non-Svelte. Chaque directive a reçu une description courte
expliquant le « pourquoi » du disable (pattern `-- raison`).

## Statut

Accepted.

## Conséquences

**Bénéfices.** Les apps Svelte sont désormais soumises au même filet
de sécurité (CSP/XSS/supply-chain) et de qualité TS (type-checked,
functional) que les packages et les CLIs. Le delta entre apps et
packages disparaît. Les nouveaux composants Svelte 5 démarrent avec
un cadre strict ; ajouter du code legacy demande explicitement un
`eslint-disable -- raison` ou une dérogation paquet.

**Prix à payer.** Les dérogations sont nombreuses, surtout sur les
apps legacy (`ecrin`, `find-an-expert`, `ui/atlas-ui`). Elles
matérialisent une dette de refactor visible et chiffrée plutôt que
masquée par un préset permissif. Chaque dérogation porte un TODO de
remédiation et un compteur d'occurrences.

**Garde-fous.**

- Toute nouvelle dérogation paquet **doit** porter un commentaire
  expliquant la raison (la règle `require-description` l'enforce).
- L'audit semestriel revoit les dérogations paquet et challenge celles
  dont le compteur n'a pas baissé.
- Si une dérogation devient stable (le refactor n'arrivera pas), elle
  peut soit remonter dans le préset (`svelte`) si elle s'applique à
  tous les paquets Svelte, soit basculer en TODO sine die dans
  l'[ADR 0019](0019-derogations-workspace-audit.md).
- Le préset `svelteRelaxed` reste exporté pour les paquets externes
  ou expérimentaux, mais aucun paquet du monorepo ne doit l'utiliser
  par défaut.

---
title: 0019 — Dérogations explicites au workspace audit
---

## Contexte

Les règles transverses du monorepo — structure des catégories
([ADR 0002](0002-monorepo-huit-categories)), CLIs thins ([ADR 0008](0008-clis-thins-logique-dans-packages)),
hygiène des dépendances (knip), durcissement sécurité (CSP, rate-limit) —
sont vérifiées en CI et en pre-push. Quelques paquets ou pratiques ont
des raisons légitimes de **ne pas suivre** ces règles.

Sans liste explicite, deux dérives apparaissent : les exceptions
s'accumulent silencieusement (chacun découvre la sienne et la code
en dur), ou les règles deviennent floues à force d'être contournées.
La discipline est de **lister chaque dérogation** avec sa raison, pour
que l'écart soit visible et révisable.

> **Note sur les « Phase X.Y ».** Plusieurs entrées ci-dessous renvoient à
> une « Phase X.Y » : il s'agit des étapes du
> [plan de résorption 2026-05-30](../plans/2026-05-30-resorption), le
> chantier de nettoyage technique et documentaire conduit de mai à
> juin 2026. Ces mentions sont des repères historiques (quand et pourquoi
> une dérogation a été introduite ou révisée) ; le plan reste la
> référence pour leur signification.

## Décision

Les dérogations actives sont listées ci-dessous, regroupées par
règle. Toute dérogation **doit** être enregistrée :

- soit dans le script audit concerné
  ([`scripts/audit/workspace-structure.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/workspace-structure.mjs))
  avec un commentaire « pourquoi » ;
- soit dans `package.json` (champs `knip.ignoreDependencies`,
  `knip.ignore`, `private: true` justifié) ;
- soit en commentaire de configuration (CSP, rate-limit, etc.).

### Workspace structure

- **`cli/crf-openapi`** — nom de paquet sans suffixe `-cli` (historique
  antérieur à la règle). Exception listée dans le script audit.
  - **Pourquoi pas migré sous `packages/`** : le paquet est **hybride**
    lib + bin (expose `core`, `extractor`, `comparator` via `exports`
    **et** un bin `crf-openapi`). La règle `audit:structure` interdit
    `bin` dans `packages/`. Une migration propre demande un split en
    `packages/crf-openapi` (lib pure) + `cli/crf-openapi` (thin bin),
    chantier qui dépasse Phase 7 du plan de résorption 2026-05-30.
    Report explicite, à reprendre en Phase ultérieure.
- **`ui/atlas-ui`** — marqué `private: true` ([ADR 0011](0011-paquets-internes-private))
  mais déclare `svelte` en `peerDependencies`. Le `peer` est respecté
  par anticipation d'une future publication.

### Dépendances knip

- **`packages/citation`** — 4 dépendances `ignoreDependencies`
  (`@effect/experimental`, `@effect/platform-node`,
  `@xenova/transformers`, `uuid`) utilisées **dynamiquement** (lazy
  imports, code généré). Knip ne les voit pas.
- **`cli/crf`** — fichier `commands/api/commands.ts` en `ignore` knip.
  Knip ne trace pas la chaîne d'imports Effect/CLI complète ; le
  fichier reste **testé** via mock direct depuis
  `commands.test.ts`.

### Hybride lib + CLI dans `packages/`

- **`packages/citation-validate`** — déclare `@clack/prompts` en
  `dependencies` directes alors que c'est une bibliothèque. Le module
  `src/prompt/` (input.ts, transformer.ts) implémente des prompts
  interactifs, et `src/actions/*.ts` + `src/events/*.ts` utilisent
  `log` de `@clack/prompts` pour la sortie utilisateur.
  - **Pourquoi pas migré vers `cli/biblio`** : le module `prompt/` est
    profondément couplé à `actions/`, `events/`, `context/`, `store/`
    (architecture Effect/Layer). Le déplacement propre demande
    d'extraire un logger injectable et de découpler les prompts du
    métier, refactor qui dépasse Phase 7 du plan de résorption
    2026-05-30. Report explicite, à reprendre en Phase ultérieure
    (probablement avec un agent spécialisé Effect).
  - Aujourd'hui : seul `cli/biblio` consomme `citation-validate`. Le
    couplage est documenté ; aucune autre app/lib ne hérite de
    `@clack/prompts` indirectement.

### Apps : factorisation partielle

- **`apps/ecrin`** — ne migre **pas** vers `@univ-lehavre/atlas-baas`
  partagé parce qu'elle utilise `TablesDB` (non exposé par le package
  partagé). À uniformiser quand `TablesDB` deviendra le standard du
  package.
- **`apps/ecrin`** — `validateSignupEmail` reste local plutôt que
  re-exporté du package partagé (lookup `isAlliance` async, erreur
  `NotPartOfAllianceError` spécifique au lieu de `NotAnEmailError` du
  package). Le reste des validators est re-exporté normalement.

### Web / sécurité

- **Cookies UI `find-an-expert`** (theme, font, dark-mode, locale) —
  `SameSite=Lax` **sans `Secure`**. Cookies non sensibles, lus côté
  client par design (rendu de la home page hors-ligne, sans session).
- **CSP `style-src 'unsafe-inline'`** — conservé pour les `style=`
  inline générés par Svelte et Bootstrap (voir [ADR 0006](0006-sveltekit-hono-bootstrap)).
  Le retrait est tracé sous Phase 5.3-tightening (sine die, voir
  [ADR 0001](0001-devsecops-perimetre-repo-sine-die)).
  - Depuis Phase 9.2 (2026-05-31), la liste des directives CSP par
    défaut et les cinq security headers statiques (HSTS, X-Content-Type-
    Options, Referrer-Policy, Permissions-Policy, X-Frame-Options) sont
    factorisés dans
    [`packages/sveltekit-csp`](https://github.com/univ-lehavre/atlas/tree/main/packages/sveltekit-csp)
    (`@univ-lehavre/atlas-sveltekit-csp`). Toutes les apps SvelteKit
    (`amarre`, `ecrin`, `find-an-expert`, `sillage`, `atlas-dashboard`,
    `crf-dashboard`) consomment ce helper via `defaultCspDirectives()`
    dans leur `svelte.config.js` et `applySecurityHeaders()` dans leur
    `hooks.server.ts`. La dérogation `style-src 'unsafe-inline'` reste
    explicite — elle est commentée à l'emplacement où elle est définie
    (`packages/sveltekit-csp/src/csp.ts`) et pointe vers le présent ADR.

### Audits dépendances

- **`audit:security` à `--audit-level=moderate`** — le seuil n'est pas
  `low`. Tightening au cas par cas : avant chaque montée du seuil, on
  vérifie qu'il y a 0 alerte moderate.

### Seuils de couverture de tests

Cible générale : `pnpm coverage:report` exécuté en CI et pre-push exige
qu'un paquet **publié ou déployé** atteigne **80% de statements** (voir
[`scripts/audit/coverage-report.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/coverage-report.mjs)).
Les paquets ci-dessous sont **explicitement exemptés** ou autorisés à
déclarer un seuil inférieur, avec la raison.

**Exemptés par nature** (aucun code exécutable à couvrir, ou code
expérimental non publié) :

- [`assets/logos`](https://github.com/univ-lehavre/atlas/tree/main/assets/logos) — paquet d'assets statiques (SVG/PNG) sans logique. Vitest entièrement retiré en Phase 2.5 (aucun `vitest.config.ts`, aucune dépendance vitest, aucun script `test`).
- [`apps/atlas-dashboard`](https://github.com/univ-lehavre/atlas/tree/main/apps/atlas-dashboard), [`apps/crf-dashboard`](https://github.com/univ-lehavre/atlas/tree/main/apps/crf-dashboard) — dashboards internes, `private: true` ([ADR 0011](0011-paquets-internes-private)), pas déployés, contenu visualisation pure.
- [`ui/atlas-ui`](https://github.com/univ-lehavre/atlas/tree/main/ui/atlas-ui) — bibliothèque de composants Svelte 5 partagée, `private: true` ([ADR 0011](0011-paquets-internes-private)), non publiée. Depuis Phase 10.2/10.3 elle a une infra de tests level-1 (vitest + happy-dom + @testing-library/svelte) et des tests a11y axe-core (`vitest-axe`), mais la couverture globale reste basse : seuls les composants migrés depuis `apps/amarre` (`TopNavbar`, `Signup`, `CreateRequest`) sont couverts (≈77–95% en propre) ; la majorité des composants (home pages, carousels, tiles) restent à couvrir au fil des migrations level-1 des apps consommatrices. Pas de seuil global imposé tant que le paquet n'est pas publié.
- [`sandbox/crf-sandbox`](https://github.com/univ-lehavre/atlas/tree/main/sandbox/crf-sandbox) — banc d'essai par construction, hors périmètre tests.

**Temporairement sous-testés** (renforcement planifié, voir [plan de
résorption 2026-05-30](https://github.com/univ-lehavre/atlas/blob/main/docs/plans/2026-05-30-resorption.md)) :

| Paquet                          | Seuils actuels (S/B/F/L) | Cible Phase suivante | Raison de l'exemption temporaire                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/amarre`                   | 50/48/32/53              | Phase ultérieure     | Phase 9.1 (réel 52.36/56/34.37/55.55, migration `atlas-sveltekit-handler`) puis Phase 13.3 : branches 54 → 48 car l'init Sentry opt-in (`if (dsn)` dans hooks.server/client) ajoute des branches non couvertes en unit. UI Svelte et services métier restent à couvrir. |
| `apps/ecrin`                    | 52/32/37/53              | Phase ultérieure     | Phase 4.3 (réel 54.18/36.56/39.81/55.78) puis Phase 13.3 : branches 34 → 32 car l'init Sentry opt-in (`if (dsn)` dans hooks.server/client) ajoute des branches non couvertes en unit. 14 endpoints API couverts ; UI Svelte et services à couvrir.                      |
| `apps/find-an-expert`           | 22/12/15/25              | Phase ultérieure     | Seuils resserrés en Phase 4.4 (réel 24.80/14.58/17.89/27.38). 17 endpoints API couverts ; routes Svelte et content dominent encore le dénominateur.                                                                                                                     |
| `cli/crf`                       | 62/62/76/60              | Phase ultérieure     | Seuils resserrés en Phase 2.6 au réel (64.59/64.70/78.43/62.71). Les bin entry points (api/index, server/index) ont un setup `@effect/cli` lourd.                                                                                                                       |
| `cli/net`                       | 48/42/38/49              | Phase ultérieure     | Seuils resserrés en Phase 2.6 au réel (50.48/44.11/40.00/51.51). Renforcement à 80%+ à planifier.                                                                                                                                                                       |
| `packages/test-utils-sveltekit` | 80/95/35/80              | Stable               | Helper paquet créé en Phase 4.2. `functions` à 35 parce que `noopCookies.{get,set,…}` (stubs requis par le type `RequestEvent['cookies']`) ne sont jamais appelés.                                                                                                      |

**Renforcés en Phase 3 — historique** : la Phase 3 du plan de résorption a fait passer 6 paquets de 0–17% à 93–100% statements ; ils sortent donc de ce tableau et passent à la cible générale 80% :

- `services/crf` : 17.54% → **93.56%** (5 fichiers test routes + middleware ajoutés).
- `packages/atlas-stats` : 6.72% → **95.96%** (4 fichiers test cache/cli/github/npm).
- `cli/biblio` : 0% → **100%** (commands/index intégralement couvert).
- `cli/citation` : 0% → **98.13%** (config/prompts/commands testés).
- `cli/atlas-stats` : 0% → **94.73%** (config/output/commands testés).
- `cli/crf-stats` : 0% → **94.90%** (config/output/commands testés).
- `cli/researcher-profiles` : 0% → **94.49%** (9 fichiers test sur 10 modules).

**Renforcés en Phase 4 — historique** : la Phase 4 a couvert tous les endpoints SvelteKit des 3 apps déployées avec un trio 200/401/payload-malformé. Les seuils des 3 apps remontent en conséquence :

- `apps/amarre` : 50.92% → **54.27%** (9/9 endpoints couverts ; 4 nouveaux fichiers test + 3 complétés).
- `apps/ecrin` : 40.14% → **54.18%** (14/14 endpoints couverts ; 10 nouveaux fichiers test).
- `apps/find-an-expert` : 19.34% → **24.80%** (17/17 endpoints couverts ; 14 nouveaux fichiers test, dont 8 utilisant `assertNoXss`).

Toute exemption supplémentaire doit être ajoutée à ce tableau dans la
PR qui l'introduit. Tout seuil temporairement abaissé doit pointer la
phase qui le rétablira.

### Rate-limit

- **Rate-limit absent** sur `/auth/login` (secret magic URL haute
  entropie, pas de credentials énumérables) et `/health`
  (lightweight, idempotent). Rate-limit ailleurs : `in-memory`
  mono-instance — à migrer vers Redis/Upstash si scale-out (item
  sine die, voir [ADR 0001](0001-devsecops-perimetre-repo-sine-die)).

## Statut

Accepted.

## Conséquences

**Bénéfices.** Chaque écart à une règle générale a un nom, une raison
et un endroit où il vit. La revue est facile : on relit cet ADR pour
voir si une exception est encore justifiée. Une dérogation « oubliée »
sans raison se détecte rapidement.

**Prix à payer.** Cet ADR doit être tenu à jour à chaque dérogation
ajoutée ou retirée. Quand le script audit évolue, il faut vérifier que
la liste reste cohérente. Le risque qu'une exception « temporaire »
devienne permanente est réel.

**Garde-fous.**

- Toute nouvelle dérogation **doit** être ajoutée à cet ADR dans la
  PR qui l'introduit.
- L'audit semestriel passe la liste en revue et challenge chaque entrée
  (« est-ce encore justifié ? »).
- Si une dérogation devient majoritaire (la règle est en réalité
  l'exception), c'est la règle qu'il faut changer — par un ADR de
  remplacement.

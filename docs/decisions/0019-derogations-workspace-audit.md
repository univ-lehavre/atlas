# 0019 — Dérogations explicites au workspace audit

## Contexte

Les règles transverses du monorepo — structure des catégories
([ADR 0002](0002-monorepo-huit-categories.md)), CLIs thins ([ADR 0008](0008-clis-thins-logique-dans-packages.md)),
hygiène des dépendances (knip), durcissement sécurité (CSP, rate-limit) —
sont vérifiées en CI et en pre-push. Quelques paquets ou pratiques ont
des raisons légitimes de **ne pas suivre** ces règles.

Sans liste explicite, deux dérives apparaissent : les exceptions
s'accumulent silencieusement (chacun découvre la sienne et la code
en dur), ou les règles deviennent floues à force d'être contournées.
La discipline est de **lister chaque dérogation** avec sa raison, pour
que l'écart soit visible et révisable.

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
- **`ui/atlas-ui`** — marqué `private: true` ([ADR 0011](0011-paquets-internes-private.md))
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
  inline générés par Svelte et Bootstrap (voir [ADR 0006](0006-sveltekit-hono-bootstrap.md)).
  Le retrait est tracé sous Phase 5.3-tightening (sine die, voir
  [ADR 0001](0001-devsecops-perimetre-repo-sine-die.md)).

### Audits dépendances

- **`audit:security` à `--audit-level=moderate`** — le seuil n'est pas
  `low`. Tightening au cas par cas : avant chaque montée du seuil, on
  vérifie qu'il y a 0 alerte moderate.

### Rate-limit

- **Rate-limit absent** sur `/auth/login` (secret magic URL haute
  entropie, pas de credentials énumérables) et `/health`
  (lightweight, idempotent). Rate-limit ailleurs : `in-memory`
  mono-instance — à migrer vers Redis/Upstash si scale-out (item
  sine die, voir [ADR 0001](0001-devsecops-perimetre-repo-sine-die.md)).

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

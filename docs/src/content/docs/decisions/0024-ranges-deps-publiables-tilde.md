---
title: "0024 — Ranges `~` sur les `dependencies` des paquets publiables"
---

## Contexte

Le monorepo publie une partie de ses paquets sur npm (tous ceux **sans**
`private: true`, cf. [ADR 0011](0011-paquets-internes-private) :
`packages/*`, `cli/*`, `services/*`, `config/*`, `assets/*`). Les paquets
internes (`apps/*`, `sandbox/*`, `ui/atlas-ui`,
`packages/test-utils-sveltekit`) restent `private` et ne sont jamais
installés par un tiers.

Historiquement, les `dependencies` de ces paquets publiables étaient
déclarées en **caret** (`^X.Y.Z`), qui accepte tout **minor + patch**
compatible (`>=X.Y.Z <(X+1).0.0`). Conséquence : un consommateur qui
installe `@univ-lehavre/atlas-citation` hérite, **au moment de SON
`install`**, du dernier minor publié de chaque dépendance — un minor que
**nous n'avons jamais testé** dans cette combinaison, puisqu'il est sorti
après notre release. La reproductibilité du build côté consommateur n'est
donc pas garantie : deux installs du même paquet à deux dates peuvent
résoudre des arbres différents.

Le lockfile (`pnpm-lock.yaml`) fige les versions **pour le monorepo**,
mais il n'est **pas** publié dans le tarball npm : il ne protège que nos
propres builds, pas ceux de nos consommateurs.

## Décision

Pour les paquets **publiables** (non-`private`), les `dependencies`
externes sont déclarées en **tilde** (`~X.Y.Z`), qui n'accepte que le
**patch** (`>=X.Y.Z <X.(Y+1).0`). Un consommateur hérite ainsi de
corrections de bugs (patch) mais **jamais** d'un minor non testé par
nous.

Règles précises :

1. **`dependencies` externes** d'un paquet publiable : `^` → `~`.
   Seul le **préfixe** change, jamais le numéro de version.
2. **`devDependencies`** : restent en `^`. Elles n'entrent pas dans le
   tarball npm et n'affectent donc pas les consommateurs ; un range large
   y facilite la maintenance interne (et Dependabot les bump de toute
   façon).
3. **`peerDependencies`** : restent en `^` (voire `>=`). Leur sémantique
   est volontairement **large** : c'est au consommateur de fournir une
   version compatible dans une plage étendue (ex. `@sveltejs/kit ^2.0.0`).
   Resserrer une peer en `~` casserait des intégrations légitimes.
4. **Dépendances internes** (`@univ-lehavre/atlas-*`) : restent en
   `workspace:*`. pnpm les réécrit en version exacte au moment du
   `publish` ; le tilde n'a pas de sens ici.
5. **Paquets `private`** : non concernés (`^` y est sans impact externe).

### Exceptions notables (conservées telles quelles)

- `packages/researcher-profiles` → `@xmldom/xmldom: ">=0.9.10"` : déjà un
  range `>=` (avis de sécurité amont imposant un plancher), pas un `^` ;
  laissé inchangé.
- `packages/citation` → `@duckdb/node-api: ~1.3.4-alpha.27` : version
  prerelease. Le `~` sur un prerelease reste valide (semver autorise
  `>=1.3.4-alpha.27 <1.4.0`), la version résolue (`1.3.4-alpha.27`) le
  satisfait toujours ; resserrement appliqué sans dérogation.

Aucune dépendance n'a nécessité un retour à `^` pour cause de conflit de
résolution : `pnpm install` régénère le lockfile sans erreur, et
`pnpm install --frozen-lockfile` reste cohérent. Le seul mouvement
observé dans le lockfile est une **déduplication** bénigne
(`@typescript-eslint/types` consolidé de `8.59.1` vers `8.59.4`, déjà
dans la plage), pas un changement de version de nos dépendances directes.

## Statut

Accepted (2026-06-01).

## Conséquences

**Bénéfices.** Reproductibilité accrue pour les consommateurs : le
tarball npm contraint l'arbre de dépendances à ce que nous avons
réellement testé (patch seulement). Un minor amont qui régresse ne peut
plus s'infiltrer silencieusement dans un build aval.

**Prix à payer.** Les mises à jour minor ne sont plus tirées
automatiquement : elles passent désormais par
**Dependabot** (cf. [`.github/dependabot.yml`](../../.github/dependabot.yml),
run hebdomadaire le lundi, minor + patch groupés en une PR par
écosystème). Le coût est un cran de latence sur les minors — assumé : un
minor mérite une PR revue et la CI verte avant d'être embarqué dans une
release publiée.

**Garde-fous.**

- Toute nouvelle `dependency` externe d'un paquet publiable doit être
  ajoutée en `~`, pas en `^`. Un range `^` sur une `dependency`
  publiable est un écart à signaler en revue.
- Si une dépendance impose un minor flottant (rare : plancher de sécurité
  amont type `>=`, ou contrainte de peer transitive), documenter
  l'exception ici plutôt que de revenir silencieusement à `^`.
- `devDependencies` et `peerDependencies` ne sont **pas** concernées par
  cette règle ; ne pas les resserrer mécaniquement.
- L'audit semestriel revérifie que les `dependencies` publiables sont
  bien en `~`.

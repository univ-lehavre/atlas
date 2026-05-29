# 0009 — `atlas` source canonique vs `amarre` standalone

## Contexte

L'application `amarre` existait initialement comme dépôt standalone
`univ-lehavre/amarre` (dernier commit le 2026-02-06). En parallèle, son
code a été intégré dans le monorepo `atlas` sous `apps/amarre/`, avec
un sync historique réalisé en PR #155 le 2026-05-19.

Deux dépôts pour une même application invitent à la dérive : un patch
sécurité appliqué dans l'un et oublié dans l'autre, deux versions npm
publiées avec des comportements divergents, des contributeurs perdus
entre deux historiques Git.

## Décision

`atlas` est la **source canonique** d'`amarre` pour tout développement
futur. Le dépôt standalone `univ-lehavre/amarre` reste figé en l'état
(dernier commit 2026-02-06) à titre d'archive ; aucun commit n'y sera
poussé.

## Statut

Accepted (2026-05-19, sync via PR #155).

## Conséquences

**Bénéfices.** Un seul historique à suivre. Toute correction sécurité,
toute mise à jour de dépendance, tout changement d'API se fait dans
`atlas` et ne peut pas être oublié dans un fork. Les outils transverses
du monorepo (CI, audit, hooks) s'appliquent automatiquement.

**Prix à payer.** Les contributeurs externes qui connaissaient
`univ-lehavre/amarre` doivent être redirigés (mention dans le README
du dépôt archivé). Les issues et PRs ouvertes côté dépôt standalone
ne sont pas migrées automatiquement.

**Garde-fous.**

- Le README du dépôt standalone affiche un encart d'archivage pointant
  vers `atlas`.
- Toute proposition de reprise des développements sur `univ-lehavre/amarre`
  est refusée et redirigée.
- Cet ADR doit être révisé si le projet décide d'extraire à nouveau
  `amarre` en standalone (par exemple pour répondre à une exigence
  client spécifique).

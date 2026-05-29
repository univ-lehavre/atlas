# 0011 — Trois paquets internes marqués `private`

## Contexte

Le monorepo publie sur npm la plupart de ses `packages/*` et `cli/*`,
sous l'organisation `@univ-lehavre`. Trois paquets, en revanche, n'ont
de sens **qu'au sein du monorepo** :

- `apps/atlas-dashboard` — tableau de bord interne pour le suivi de la
  qualité du dépôt (KPI, coverage, audit). Pas de cas d'usage hors
  monorepo.
- `apps/crf-dashboard` — tableau de bord opérationnel autour du
  service CRF. Couplé à la base REDCap interne, pas réutilisable
  ailleurs.
- `sandbox/crf-sandbox` — banc d'essai dédié à CRF, code expérimental
  par construction.

Sans précaution, un `pnpm changeset publish` ou un script de release
mal configuré peut publier accidentellement ces paquets sur npm, avec
des conséquences allant du bruit (paquet inutile sur le registre) à
la fuite d'information (URLs internes, code expérimental exposé).

## Décision

Les trois paquets — `apps/atlas-dashboard`, `apps/crf-dashboard`,
`sandbox/crf-sandbox` — ont `"private": true` dans leur `package.json`.
Cela bloque toute publication par npm comme par changesets.

## Statut

Accepted (2026-05-22).

## Conséquences

**Bénéfices.** Aucune publication accidentelle possible. La nature
« interne » du paquet est lisible directement dans le `package.json`.
Les outils du monorepo (turbo, audit:structure) traitent ces paquets
comme des consommateurs, pas comme des bibliothèques.

**Prix à payer.** Si un de ces paquets devait être publié à terme
(par exemple, ouvrir le dashboard à d'autres équipes), le `private: true`
doit être levé explicitement — ce qui est volontairement plus visible
qu'un simple changement de scope npm.

**Garde-fous.**

- `audit:structure` vérifie que les paquets sous `apps/` et `sandbox/`
  sont `private` par défaut.
- Toute levée du `private: true` demande un ADR explicite (cet ADR
  est révisé ou superseded).
- Les `apps/` réellement déployées (`amarre`, `ecrin`, `find-an-expert`)
  ne sont **pas** marquées `private` : elles publient leur version pour
  permettre le suivi de release via changesets, mais leur publication
  effective est gérée par leur pipeline de déploiement.

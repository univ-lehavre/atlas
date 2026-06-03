---
title: 0021 — Politique de dépendances pour les sandboxes
---

## Contexte

Les paquets `sandbox/*` regroupent les bancs d'essai du monorepo : ils
embarquent une stack `docker compose` (Appwrite + Mailpit + REDCap +
MongoDB selon les cas), les scripts de bootstrap associés (provisioning
de l'instance REDCap, seed de données factices ou pull depuis prod) et
les tests Playwright qui drivent la stack complète.

Aucune règle n'avait été explicitement formalisée sur leurs
**dépendances** :

- les sandboxes peuvent-ils dépendre d'un paquet `packages/*` ? (souhaité
  pour réutiliser des helpers, par exemple `@univ-lehavre/atlas-crf-client`
  dans un script de bootstrap REDCap)
- d'une `app/*` ? (réponse intuitive : non, ce serait l'inverse — c'est
  le sandbox qui sert l'app)
- d'un autre `sandbox/*` ? (cas réel : `amarre-sandbox` et `sillage-sandbox`
  incluent tous deux le `docker-compose.yml` de `crf-sandbox` via
  `include:`, sans dépendance npm)

Sans règle écrite, les agents (humains ou Claude) qui modifient les
sandboxes prennent des décisions au coup par coup, et l'audit
`workspace-structure` ne peut pas les vérifier.

## Décision

Les paquets `sandbox/*` suivent ces règles de dépendances :

1. **Peuvent dépendre** de :
   - `packages/*` publics du monorepo (helpers métier, validators,
     types), via `@univ-lehavre/atlas-*` en `devDependencies`.
   - `cli/*` publics si le script de bootstrap a besoin d'invoquer un
     CLI atlas (rare, mais légitime).
   - `config/shared-config` pour ESLint, Prettier, vitest, TypeScript.
   - Des dépendances externes (`@playwright/test`, `tsx`, `@faker-js/faker`,
     `node-appwrite`…) en `devDependencies`.
2. **Ne doivent PAS dépendre** de :
   - **Une `app/*`** (`amarre`, `ecrin`, `find-an-expert`, etc.) — c'est
     le sandbox qui hôte l'app en local pour ses tests, pas l'inverse.
     L'app est démarrée via `pnpm dev` côté hôte, le sandbox n'en
     importe rien.
   - **Un `service/*`** — même raison : c'est le sandbox qui hôte le
     service via docker, sans `import`.
   - **Un `ui/*`** — UI partagée, non utilisable hors `app/*`.
   - **Un autre `sandbox/*`** au niveau **npm** (`dependencies` ou
     `devDependencies`). Le partage de docker-compose entre sandboxes
     se fait via `include:` côté `docker-compose.yml` (chemin relatif
     vers `sandbox/crf-sandbox/docker/docker-compose.yml`), pas via
     un import JS/TS. Cette séparation préserve la possibilité de
     supprimer ou renommer un sandbox sans casser les autres au niveau
     npm.
3. **Marqués `private: true`** (cf. [ADR 0011](/atlas/decisions/0011-paquets-internes-private/)) —
   garantit aucune publication accidentelle.

### Enforcement

- `scripts/audit/workspace-structure.mjs` interdit déjà aux paquets
  non-sandbox de dépendre d'un sandbox (règle « sandbox isolation »).
- La nouvelle règle « sandbox ne dépend pas d'app/service/ui » sera
  ajoutée si une régression est observée (pour le moment, aucun
  sandbox ne dérive cette politique).
- L'inclusion docker compose (`include:`) reste autorisée — c'est un
  mécanisme docker, pas npm.

## Statut

Accepted (2026-05-31).

## Conséquences

**Bénéfices.** Cadre clair pour les contributeurs (humains ou agents)
qui touchent aux sandboxes. Le `pnpm install` reste rapide (les
sandboxes ne tirent que ce qu'ils utilisent vraiment). La séparation
sandbox ↔ app rend possible le « démarrage à la demande » : on lance
`pnpm --filter=@univ-lehavre/atlas-amarre dev` sans monter le compose
quand on développe la couche front.

**Prix à payer.** Si un sandbox a besoin de la logique d'une app (ex.
calcul de hash pour authentification), il faut soit dupliquer le code,
soit l'extraire dans un `packages/*` partagé. C'est volontairement plus
cher qu'un import direct — pour préserver la possibilité d'évoluer
l'app indépendamment.

**Garde-fous.**

- Toute proposition d'import sandbox → app/service/ui demande une
  révision de cet ADR (et probablement une extraction dans
  `packages/*`).
- L'audit semestriel passe la liste en revue.

Cette politique est référencée dans
[`docs/architecture/monorepo.md`](/atlas/architecture/monorepo/).

---
title: "0061 — Accélérer la CI : cache de contenu, parallélisation des jobs, court-circuit élargi"
---

## Contexte

La CI principale ([`ci.yml`](https://github.com/univ-lehavre/atlas)) tournait en
~9 min médian sur une PR avec code. La mesure des runs réels (`gh run view`) a
montré trois sources de lenteur, par ordre d'impact :

1. **Le cache Turbo ne se réutilisait quasiment jamais.** La clé de cache
   `actions/cache` portait `${{ github.sha }}` — unique par commit. La clé
   exacte n'était donc **jamais** retrouvée d'un run à l'autre ; seul le
   `restore-keys` partiel (préfixe) rattrapait un cache. Pire, les six jobs
   écrivaient tous le même chemin `.turbo` avec une clé SHA différente : comme
   `actions/cache` ne réécrit pas une entrée déjà présente, le cache se figeait
   sur le premier job qui le peuplait. Conséquence concrète : `pnpm lint`
   (ESLint type-aware via `projectService` sur ~42 paquets) coûtait **~319 s**,
   sans bénéficier du cache des paquets non modifiés.

2. **Les jobs étaient inutilement sérialisés.** `Build` attendait
   `lint + typecheck + test`, et `Documentation` attendait `Build`. Or Turbo
   gère déjà l'ordre réel des tâches (`^build`) **à l'intérieur** de chaque job ;
   chaîner les jobs CI entre eux n'ajoutait que des barrières d'attente. Lint,
   typecheck et test sont des **gates de qualité**, pas des dépendances de build.

3. **Le préambule était dupliqué six fois** (checkout, pnpm, Node, `.env`
   SvelteKit, install, cache) et certains jobs ne profitaient d'aucune
   factorisation. Le job DataOps (Python) ne cachait pas non plus l'environnement
   `uv` (re-téléchargement + re-résolution à chaque run).

Le court-circuit « doc-only » ([ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/))
existait déjà pour `Test`/`Typecheck`/`Build`, mais `Lint` et `Audit` tournaient
**toujours** : une PR purement documentaire payait quand même ~5 min de lint.

### Pourquoi pas de remote cache Turbo

Un remote cache Turbo (Vercel ou self-hosté) aurait donné les meilleurs hits,
mais : Vercel envoie les hashs/artefacts chez un tiers, et un self-hosté ajoute
une infrastructure à exploiter et sécuriser. Décision : **on ne dépend d'aucun
remote cache** pour l'instant ; on corrige d'abord le bug de clé, qui capte
l'essentiel du gain à coût nul. `TURBO_TOKEN`/`TURBO_TEAM` restent câblés dans
l'`env` du workflow pour qu'un remote cache puisse être activé plus tard sans
retoucher les jobs.

## Décision

> **On accélère la CI sans changer les contrats de la branch protection.** Aucun
> nom de job (= contexte de check requis, [ADR 0016](/atlas/decisions/0016-branch-protection-main/))
> n'est renommé, et aucun job requis ne devient `skipped` : le court-circuit
> reste au niveau **step** ([ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)).

Quatre changements :

1. **Clé de cache Turbo par contenu.** La clé devient
   `turbo-v3-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml', 'turbo.json', 'tsconfig.json') }}`.
   Tant que ces fichiers ne changent pas, la clé est stable : le cache se partage
   réellement entre jobs et entre runs. `restore-keys` dégrade vers le dernier
   cache du même OS si la clé exacte manque.

2. **Action composite locale `.github/actions/setup-workspace`.** Elle factorise
   pnpm + Node (cache pnpm) + `.env` SvelteKit + `install --frozen-lockfile
--prefer-offline` + cache Turbo. Les jobs l'appellent après leur `checkout`.
   On garde une action composite (partage de _steps_ dans un job) plutôt qu'un
   `workflow_call` (réorchestration de jobs) précisément pour **ne pas** changer
   le découpage des jobs ni les noms des checks requis.

3. **Parallélisation.** Tous les jobs lourds dépendent de `[changes]` seul.
   `Build` et `Documentation` ne dépendent plus de lint/typecheck/test. Turbo
   construit l'ordre réel des tâches en interne.

4. **Court-circuit doc-only élargi.** `Lint` et `Audit` adoptent le drapeau `RUN`
   (`needs.changes.outputs.code == 'true'`) déjà utilisé par Test/Typecheck/Build.
   Sur une PR documentaire, leurs steps lourds sont sautés et le job sort
   `success` — **jamais** `skipped`. Le job DataOps active `enable-cache: true` sur
   `setup-uv`.

## Statut

Accepted (2026-06-13). Étend [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)
(le court-circuit step-level couvre désormais Lint et Audit) et compose avec
[ADR 0016](/atlas/decisions/0016-branch-protection-main/) (noms de jobs et
rapport des contextes requis inchangés).

## Conséquences

**Bénéfices.** Le cache Turbo profite enfin aux paquets non modifiés : sur une PR
qui ne touche que quelques paquets, le lint et le build tombent en grande partie
en cache. Le chemin critique raccourcit (Build et Documentation ne sont plus
derrière les gates). Une PR documentaire ne paie plus ni lint ni audit. Le
préambule dupliqué disparaît (la refonte retire plus de lignes qu'elle n'en
ajoute), ce qui réduit aussi le risque de dérive entre jobs.

**Prix à payer.**

- **`strict: true` sur la branch protection** (require branches up to date)
  oblige toujours à reciler sur `main` avant merge ; l'accélération réduit le
  coût de ces re-runs mais ne supprime pas la contrainte.
- La clé de cache liste explicitement les fichiers de configuration de tâches
  (`turbo.json`, `tsconfig.json` racine). Si une nouvelle source de config
  influence les sorties de tâche sans figurer dans `hashFiles`, le cache pourrait
  servir une entrée périmée — à compléter le cas échéant (faux positif **rare**,
  corrigé en bumpant `turbo-v3` → `v4`).
- Détacher `Documentation` de `Build` suppose que `docs:build` ne lit que des
  sources (README, `package.json`, historique git), jamais un artefact buildé du
  workspace. C'est le cas aujourd'hui ; si la doc venait à consommer un `dist/`,
  il faudrait rétablir la dépendance.

**Garde-fous.**

- **Ne jamais renommer un job de `ci.yml`** sans mettre à jour la liste des
  contextes requis de la branch protection — un contexte requis introuvable
  bloque tout merge (corollaire de [ADR 0016](/atlas/decisions/0016-branch-protection-main/)).
- **Court-circuit au niveau step, jamais job** : invariant repris de
  [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/).
- Bumper le préfixe de clé (`turbo-vN`) à chaque fois qu'on soupçonne un cache
  empoisonné ou qu'on change la sémantique des inputs Turbo.
- **Les workflows sont du code à valider.** `actionlint` garde désormais
  `.github/workflows/**` et `.github/actions/**` (hook lefthook pre-push + step
  du job `Audit`) : il attrape un `needs` orphelin, un `uses` non résolvable ou
  une expression `${{ }}` cassée avant qu'un workflow ne parte muet en
  production — précisément le genre d'erreur qui, sur un check requis, bloque
  tout merge (corollaire de [ADR 0016](/atlas/decisions/0016-branch-protection-main/)).

# Comment on travaille ensemble

Cette page décrit le **flux standard de contribution** au dépôt Atlas, de l'idée à la fusion dans `main`. Le but est qu'un contributeur n'ait pas à réinventer le chemin : chaque étape est outillée et documentée.

## En une image

```
1. Issue (optionnel)
        │
        ▼
2. Fork (contributeurs externes seulement)
        │
        ▼
3. Branche depuis main          ─┐
        │                         │
        ▼                         │
4. Commits (Conventional)         │  Hooks Git
        │                         │  (lefthook)
        ▼                         │
5. Push                          ─┘
        │
        ▼
6. Pull Request                  ─┐
        │                         │
        ▼                         │  Intégration
7. CI (lint, types, tests…)       │  continue (CI)
        │                         │  (GitHub Actions)
        ▼                         │
8. Revue de code                 ─┘
        │
        ▼
9. Merge dans main
        │
        ▼
10. Release automatisée (si paquet publiable touché)
```

## 1. Issue (optionnel mais conseillé)

Avant un changement non trivial, ouvrir une [issue](https://github.com/univ-lehavre/atlas/issues) pour décrire le problème ou la proposition. Permet de discuter de l'approche avant d'investir du temps en code.

Pour signaler un bug ou une remarque sur la documentation, l'issue suffit — **pas besoin de savoir coder**.

## 2. Forker (contributeurs externes)

Tout le monde n'a pas le droit d'écrire directement sur le dépôt `univ-lehavre/atlas`. Si vous n'avez pas cet accès, vous devez d'abord créer un [**fork**](../glossary.md) : une copie personnelle du dépôt sur votre propre compte GitHub, où vous pouvez créer des branches librement et proposer vos changements via une pull request.

1. Cliquer sur **Fork** en haut à droite de [github.com/univ-lehavre/atlas](https://github.com/univ-lehavre/atlas).
2. GitHub crée `<votre-compte>/atlas`.
3. Cloner votre fork : `git clone https://github.com/<votre-compte>/atlas.git`.
4. Créer une branche (section suivante), puis ouvrir la pull request — GitHub compare automatiquement votre branche avec le `main` du dépôt principal.

Si vous **avez** l'accès en écriture (mainteneur), sautez cette étape : vous travaillez directement sur une branche du dépôt principal.

## 3. Créer une branche

Depuis `main` à jour (du dépôt principal, ou de votre fork) :

```bash
git switch main
git pull
git switch -c <type>/<description-courte>
```

Convention de nommage (libre, mais lisible) : `feat/auth-redirect`, `fix/csp-connect-src`, `docs/clean-readme`.

## 4. Commits

Tous les messages suivent **[Conventional Commits](https://www.conventionalcommits.org/)** :

```
type(scope): description courte en impératif

[corps optionnel : pourquoi, contexte, références]
```

Types courants : `feat` (nouvelle fonctionnalité), `fix` (correction), `docs`, `refactor`, `test`, `chore`, `ci`, `build`.

Le hook _commit-msg_ vérifie le format. Voir [Hooks Git](../quality/hooks.md).

## 5. Push

```bash
git push -u origin <branche>
```

Le hook _pre-push_ lance les audits, les tests et la détection de code mort sur l'ensemble du dépôt. Si quelque chose échoue, **corriger avant de pousser** plutôt que de contourner le hook.

## 6. Ouvrir une pull request

Sur GitHub, cliquer sur **Compare & pull request** dans le bandeau qui apparaît après le push. Le modèle de PR pose les bonnes questions :

- **Pourquoi** ce changement ?
- **Quoi** a été modifié ?
- **Comment** vérifier que ça marche ?

Si le changement modifie un paquet publiable (`packages/*`, `cli/*`, `services/*`, `ui/*`), **joindre un changeset** :

```bash
pnpm changeset:add
```

L'outil pose deux questions : quels paquets sont touchés ? Quel type de changement (`patch`, `minor`, `major`) ? Le fichier `.changeset/*.md` ainsi créé doit être commité dans la PR.

## 7. CI

À l'ouverture et à chaque push sur la PR, GitHub Actions lance :

- `ci.yml` : lint, typecheck, test, build, docs, audits
- `codeql.yml` : analyse statique de sécurité
- `gitleaks.yml` : détection de secrets
- `dependency-review.yml` : revue des nouvelles dépendances

Voir [Pipeline CI](../quality/ci-pipeline.md). Tant que tout n'est pas vert, la PR ne peut pas être fusionnée.

## 8. Revue de code

Au moins **une revue** approuvée par un autre contributeur (ou par le mainteneur) est requise avant fusion. La revue couvre :

- la cohérence avec le reste du dépôt,
- la pertinence des choix techniques,
- la qualité des tests,
- la lisibilité.

Le reviewer peut demander des modifications via les commentaires GitHub. Itérer dans la même branche — pas besoin d'ouvrir une nouvelle PR.

## 9. Merge

Le mainteneur fusionne la PR dans `main`. Le choix entre **squash** (un seul commit) et **merge commit** (préserve l'historique de la branche) dépend de la PR :

- **Squash** par défaut : une PR = un commit dans `main`. Plus propre, plus lisible dans `git log`.
- **Merge commit** pour les PR multi-étapes où chaque commit individuel est utile à conserver (refactor incrémental, migration en plusieurs étapes).

## 10. Release (si publiable)

Si la PR fusionnée contenait un changeset, le bot **Changesets** ouvre automatiquement une PR **« Version Packages »** qui agrège les changesets en bumps de version et met à jour les `CHANGELOG.md`. La fusion de cette PR déclenche la publication npm. Voir [Releases](./releases.md).

## Si tu débutes

- Ouvrir une issue est toujours acceptable, même pour signaler qu'une phrase de la documentation est floue.
- Lire [CONTRIBUTING.md](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md) à la racine du dépôt pour les détails techniques, et [Environnement de développement local](./environnement-local.md) pour la configuration de la machine (Node, pnpm, hooks).
- Demander un mentor sur ta première PR — un membre du projet revue le travail au fil de l'eau et explique les conventions.

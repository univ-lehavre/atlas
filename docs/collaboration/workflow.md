# Comment on travaille ensemble

Cette page décrit le **flux standard de contribution** au dépôt Atlas, de l'idée à la fusion dans `main`. Le but est qu'un contributeur n'ait pas à réinventer le chemin : chaque étape est outillée et documentée.

## En une image

```
1. Issue (optionnel)
        │
        ▼
2. Branche depuis main          ─┐
        │                         │
        ▼                         │
3. Commits (Conventional)         │  Hooks Git
        │                         │  (lefthook)
        ▼                         │
4. Push                          ─┘
        │
        ▼
5. Pull Request                  ─┐
        │                         │
        ▼                         │  Intégration
6. CI (lint, types, tests…)       │  continue (CI)
        │                         │  (GitHub Actions)
        ▼                         │
7. Revue de code                 ─┘
        │
        ▼
8. Merge dans main
        │
        ▼
9. Release automatisée (si paquet publiable touché)
```

## 1. Issue (optionnel mais conseillé)

Avant un changement non trivial, ouvrir une [issue](https://github.com/univ-lehavre/atlas/issues) pour décrire le problème ou la proposition. Permet de discuter de l'approche avant d'investir du temps en code.

Pour signaler un bug ou une remarque sur la documentation, l'issue suffit — **pas besoin de savoir coder**.

## 2. Créer une branche

Depuis `main` à jour :

```bash
git switch main
git pull
git switch -c <type>/<description-courte>
```

Convention de nommage (libre, mais lisible) : `feat/auth-redirect`, `fix/csp-connect-src`, `docs/clean-readme`.

## 3. Commits

Tous les messages suivent **[Conventional Commits](https://www.conventionalcommits.org/)** :

```
type(scope): description courte en impératif

[corps optionnel : pourquoi, contexte, références]
```

Types courants : `feat` (nouvelle fonctionnalité), `fix` (correction), `docs`, `refactor`, `test`, `chore`, `ci`, `build`.

Le hook _commit-msg_ vérifie le format. Voir [Hooks Git](../quality/hooks.md).

## 4. Push

```bash
git push -u origin <branche>
```

Le hook _pre-push_ lance les audits, les tests et la détection de code mort sur l'ensemble du dépôt. Si quelque chose échoue, **corriger avant de pousser** plutôt que de contourner le hook.

## 5. Ouvrir une pull request

Sur GitHub, cliquer sur **Compare & pull request** dans le bandeau qui apparaît après le push. Le modèle de PR pose les bonnes questions :

- **Pourquoi** ce changement ?
- **Quoi** a été modifié ?
- **Comment** vérifier que ça marche ?

Si le changement modifie un paquet publiable (`packages/*`, `cli/*`, `services/*`, `ui/*`), **joindre un changeset** :

```bash
pnpm changeset:add
```

L'outil pose deux questions : quels paquets sont touchés ? Quel type de changement (`patch`, `minor`, `major`) ? Le fichier `.changeset/*.md` ainsi créé doit être commité dans la PR.

## 6. CI

À l'ouverture et à chaque push sur la PR, GitHub Actions lance :

- `ci.yml` : lint, typecheck, test, build, docs, audits
- `codeql.yml` : analyse statique de sécurité
- `gitleaks.yml` : détection de secrets
- `dependency-review.yml` : revue des nouvelles dépendances

Voir [Pipeline CI](../quality/ci-pipeline.md). Tant que tout n'est pas vert, la PR ne peut pas être fusionnée.

## 7. Revue de code

Au moins **une revue** approuvée par un autre contributeur (ou par le mainteneur) est requise avant fusion. La revue couvre :

- la cohérence avec le reste du dépôt,
- la pertinence des choix techniques,
- la qualité des tests,
- la lisibilité.

Le reviewer peut demander des modifications via les commentaires GitHub. Itérer dans la même branche — pas besoin d'ouvrir une nouvelle PR.

## 8. Merge

Le mainteneur fusionne la PR dans `main`. Le choix entre **squash** (un seul commit) et **merge commit** (préserve l'historique de la branche) dépend de la PR :

- **Squash** par défaut : une PR = un commit dans `main`. Plus propre, plus lisible dans `git log`.
- **Merge commit** pour les PR multi-étapes où chaque commit individuel est utile à conserver (refactor incrémental, migration en plusieurs étapes).

## 9. Release (si publiable)

Si la PR fusionnée contenait un changeset, le bot **Changesets** ouvre automatiquement une PR **« Version Packages »** qui agrège les changesets en bumps de version et met à jour les `CHANGELOG.md`. La fusion de cette PR déclenche la publication npm. Voir [Releases](./releases.md).

## Si tu débutes

- Ouvrir une issue est toujours acceptable, même pour signaler qu'une phrase de la documentation est floue.
- Lire [CONTRIBUTING.md](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md) à la racine du dépôt pour les détails techniques (configuration locale, commandes utiles).
- Demander un mentor sur ta première PR — un membre du projet revue le travail au fil de l'eau et explique les conventions.

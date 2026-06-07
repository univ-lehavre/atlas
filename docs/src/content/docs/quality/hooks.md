---
title: Hooks Git
---

Quelques mots de vocabulaire d'abord ([glossaire complet](/atlas/glossary/)) : [**Git**](/atlas/glossary/) est le système de contrôle de version qui enregistre l'historique du code ; un [**commit**](/atlas/glossary/) est un enregistrement daté de modifications accompagné d'un message ; une **branche** est une ligne de travail parallèle dans l'historique, sur laquelle on accumule des commits sans toucher à la branche principale `main` ; un [**push**](/atlas/glossary/) envoie ses commits vers GitHub ; une [**pull request**](/atlas/glossary/) propose le **merge** (la fusion) d'une branche dans `main`, c'est-à-dire l'intégration de ses commits dans la branche principale, après revue.

Un **hook Git** est un petit script que Git lance automatiquement à certains moments du cycle de vie d'un commit (avant un commit, au moment de rédiger le message, avant un push…). Atlas s'en sert pour vérifier en local — sur la machine du contributeur — ce qui sera vérifié de toute façon en CI. Avantage : on découvre les erreurs immédiatement, sans attendre 3 min de pipeline pour une virgule oubliée.

L'outil qui orchestre les hooks dans Atlas est **[lefthook](https://github.com/evilmartians/lefthook)**. Sa configuration est dans [`lefthook.yml`](https://github.com/univ-lehavre/atlas/blob/main/lefthook.yml).

## Installation

Lefthook s'installe automatiquement quand on lance `pnpm install` à la racine du dépôt — le script `prepare` du `package.json` appelle `lefthook install`. Aucune action manuelle requise.

```bash
pnpm install      # Installe les dépendances + active les hooks
```

Pour vérifier que les hooks sont actifs :

```bash
ls -la .git/hooks/
# Doit lister pre-commit, commit-msg, pre-push
```

## Pre-commit (rapide)

Déclenché à chaque `git commit`, avant que le commit ne soit créé. S'exécute sur les **fichiers modifiés** uniquement — donc rapide même sur un gros dépôt.

| Hook           | Outil                                                      | Rôle                                                     |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| `check-branch` | (script intégré)                                           | Interdit les commits directs sur `main`                  |
| `gitleaks`     | [gitleaks](https://github.com/gitleaks/gitleaks)           | Détecte les secrets accidentellement écrits dans le code |
| `format`       | [Prettier](https://prettier.io/)                           | Formatage cohérent du code                               |
| `lint`         | [ESLint](https://eslint.org/)                              | Règles de style, fonctionnelles et sécurité              |
| `typecheck`    | [TypeScript](https://www.typescriptlang.org/)              | Vérification de types                                    |
| `svelte-check` | [svelte-check](https://github.com/sveltejs/language-tools) | Validation des fichiers `.svelte`                        |

> Si gitleaks n'est pas installé localement, le hook continue avec un avertissement et délègue le scan à la CI (`gitleaks.yml`).

## Commit-msg

Déclenché à la rédaction du message de commit. Vérifie le format **[Conventional Commits](https://www.conventionalcommits.org/)** :

```
type(scope): description courte

[corps optionnel sur plusieurs lignes]

[footer optionnel]
```

Outil : [commitlint](https://commitlint.js.org/). Configuration : [`commitlint.config.js`](https://github.com/univ-lehavre/atlas/blob/main/commitlint.config.js).

Un script `strip-email-line` (intégré à lefthook) supprime aussi les lignes contenant des adresses email du message de commit, et nettoie les doubles lignes vides. Cela évite que des emails personnels se retrouvent dans l'historique public.

## Pre-push (plus lent)

Déclenché à chaque `git push`, avant l'envoi au _remote_ (le dépôt distant hébergé sur GitHub). S'exécute sur **l'ensemble du dépôt**, donc plus lent (~30 s à 2 min selon la machine).

| Hook             | Commande                         | Rôle                                                                            |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `check-branch`   | (script intégré)                 | Interdit les push directs sur `main`                                            |
| `check-sync`     | (script intégré)                 | Avertit si la branche n'est pas à jour avec `origin/main`                       |
| `check-audit`    | `pnpm audit:security`            | Vulnérabilités npm connues                                                      |
| `check-licenses` | `pnpm audit:licenses`            | Compatibilité des licences                                                      |
| `check-lockfile` | `pnpm install --frozen-lockfile` | Cohérence entre `package.json` et `pnpm-lock.yaml` (uniquement si touchés)      |
| `test`           | `pnpm test:coverage`             | Suite de tests complète avec couverture                                         |
| `cpd`            | `pnpm audit:duplicates`          | Détection de duplication de code ([jscpd](https://github.com/kucherenko/jscpd)) |
| `knip`           | `pnpm audit:unused`              | Détection de code mort ([knip](https://knip.dev/))                              |

## Contourner exceptionnellement

Atlas **refuse** par défaut de contourner les hooks. Les flags `--no-verify` et équivalents sont à proscrire — un hook qui échoue indique un problème réel.

Si vraiment nécessaire (incident, hotfix), corriger d'abord la cause racine, puis créer un nouveau commit propre. Ne **pas** committer avec `--no-verify` pour repousser le problème.

## Si un hook est trop lent

Les hooks pre-commit s'exécutent uniquement sur les fichiers modifiés — leur durée est proportionnelle à la taille de la PR. Si la lenteur vient d'un hook pre-push :

- **`test`** dépend de la couverture du code modifié — un changement dans un paquet très testé prend plus longtemps. Possible de lancer `pnpm test:coverage` avant le push pour anticiper.
- **`cpd`** et **`knip`** sont lents par construction (parcourent tout le dépôt). Ils ne peuvent pas être accélérés sans risque ; ils restent en pre-push pour garantir que rien ne passe à la trappe.

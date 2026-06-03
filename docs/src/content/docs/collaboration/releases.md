---
title: Releases
---

Atlas publie ses **paquets publiables** (bibliothèques, outils en ligne de commande, services consommables) sur le registre [npm](https://www.npmjs.com/) public sous le _scope_ `@univ-lehavre/atlas-*`. Les applications utilisateur (catégorie [`apps/`](https://github.com/univ-lehavre/atlas/tree/main/apps)) ne sont **pas** publiées sur npm ; elles sont déployées séparément.

## Le mécanisme : Changesets

Atlas utilise **[Changesets](https://github.com/changesets/changesets)**, un outil qui découple deux étapes :

1. **Le contributeur** déclare un changement dans sa pull request.
2. **Le bot** agrège les déclarations et orchestre les bumps de version et la publication.

## Workflow complet

```
contributeur                          bot Changesets                      registre npm
     │                                       │                                  │
     │ ouvre PR + ajoute                     │                                  │
     │ .changeset/*.md                       │                                  │
     │ ───────────────────▶                  │                                  │
     │                                       │                                  │
     │      [merge dans main]                │                                  │
     │                                       │                                  │
     │                                       │ ouvre PR                         │
     │                                       │ "Version Packages"               │
     │                                       │  (bump versions + CHANGELOG)     │
     │                                       │                                  │
     │      [merge de la PR Version]         │                                  │
     │                                       │                                  │
     │                                       │ ─────  publication ───────────▶ │
     │                                       │       (avec provenance OIDC)     │
```

## 1. Ajouter un changeset

Dans la PR qui modifie un paquet publiable :

```bash
pnpm changeset:add
```

L'outil pose deux questions interactives :

- **Quels paquets sont touchés ?** (sélection multiple parmi les paquets du _workspace_)
- **Quel type de bump ?**
  - `patch` — correction de bug, sans changement d'API
  - `minor` — nouvelle fonctionnalité rétrocompatible
  - `major` — changement incompatible (_breaking change_)

Le fichier `.changeset/<slug>.md` créé doit être commité avec le reste de la PR. Son contenu :

```markdown
---
"@univ-lehavre/atlas-foo": minor
"@univ-lehavre/atlas-bar": patch
---

Description courte du changement.
```

## 2. PR « Version Packages »

À chaque merge sur `main` contenant des changesets, le bot `changesets/action` ouvre automatiquement une PR titrée **« Version Packages »**. Cette PR :

- consomme les fichiers `.changeset/*.md`,
- incrémente les versions dans les `package.json` concernés,
- met à jour les `CHANGELOG.md` correspondants.

Le mainteneur revue la PR et la fusionne quand le moment est bon (cumul de changements, alignement avec un événement externe, etc.).

## 3. Publication npm

Le merge de la PR « Version Packages » déclenche le _workflow_ [`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml) :

```bash
turbo build --filter='!./apps/**'   # Build de tout sauf les apps
./scripts/release/publish-packages.sh
```

Le script `publish-packages.sh` itère sur les paquets dont la version a été bumpée et exécute pour chacun :

```bash
npm publish --provenance --access public
```

Le flag `--provenance` active la signature **OIDC** : npm reçoit une attestation cryptographique liant le paquet publié à son code source (commit, _workflow_ GitHub Actions, _runner_). Les consommateurs peuvent la vérifier avec `npm audit signatures`.

## Vérifier la provenance d'un paquet publié

```bash
# Provenance complète d'un paquet
npm view @univ-lehavre/atlas-crf-client@<version> --json | jq .dist.attestations

# Vérifie la signature
npm audit signatures
```

## Paquets renommés ou dépréciés

Quand un paquet est renommé (par exemple `crf-core` → `redcap-client`), un script déprécie l'ancien nom pour signaler aux consommateurs où aller :

```bash
pnpm release:deprecate-renamed
```

Le script lit `scripts/release/deprecate-renamed-packages.sh` qui contient la liste des renommages et exécute `npm deprecate <old> "<message>"` pour chacun. L'ancien paquet reste accessible (pas de `unpublish`) mais affiche un avertissement à l'installation.

## Si la release échoue

1. Cliquer sur le run rouge dans [Actions → Release](https://github.com/univ-lehavre/atlas/actions/workflows/release.yml).
2. Identifier le paquet en échec (souvent : conflit de version, _token_ expiré, build qui échoue).
3. Corriger en local, ouvrir une PR de fix.
4. Une fois fusionnée, relancer manuellement le _workflow_ Release ou attendre la prochaine PR « Version Packages ».

**Ne jamais** publier manuellement (`npm publish` depuis une machine de dev) — la provenance OIDC ne serait pas attachée et le paquet ne serait pas vérifiable.

# 0003 — `packages/logos` splitté en `assets/logos` + `cli/logos`

## Contexte

L'ex-paquet `packages/logos` faisait deux choses :

1. Hébergeait les fichiers SVG/PNG de logos partagés entre les apps.
2. Exposait un binaire `atlas-logos-install` qui copie ces fichiers dans
   `static/logos/` d'une app SvelteKit à l'étape `prepare`.

Cette cohabitation viole la règle « pas de `bin` dans `packages/` »
fixée par [ADR 0002](0002-monorepo-huit-categories.md). Plus pernicieux,
elle force tout consommateur des fichiers à tirer aussi le runtime du
CLI (`fs`, `path`, parsing d'options), ce qui pollue les `node_modules`
côté apps déployées.

## Décision

Le paquet est scindé en deux :

- **`assets/logos/`** — fichiers statiques uniquement. Pas de `bin`,
  pas de code exécutable, pas de dépendances runtime. Publié sur npm
  comme paquet de ressources.
- **`cli/logos/` (`@univ-lehavre/atlas-logos-cli`)** — fournit le
  binaire `atlas-logos-install`, dépend du paquet `assets/logos/` pour
  localiser les fichiers à copier.

Les `apps/` qui ont besoin d'installer les logos au `prepare`
dépendent du CLI (`devDependencies`), pas du paquet d'assets directement.

## Statut

Accepted (2026-05-27, PR #211).

## Conséquences

**Bénéfices.** La règle « pas de `bin` dans `packages/` » devient
appliquable sans exception. Le paquet d'assets a un graphe de
dépendances vide, donc son installation est triviale. Le CLI a une
seule responsabilité claire.

**Prix à payer.** Deux paquets publiés à maintenir au lieu d'un. Les
bumps de version doivent rester cohérents (un changement de structure
d'assets impacte le CLI).

**Garde-fous.**

- L'audit `audit:structure` vérifie qu'`assets/logos/` n'a pas de `bin`
  ni de dépendances runtime non-asset.
- Tout nouveau paquet d'assets suit le même pattern (séparation
  fichiers / outil d'installation).

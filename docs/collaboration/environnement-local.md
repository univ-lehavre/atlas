# Environnement de développement local

Cette page décrit **ce qu'il faut installer sur sa machine** pour
développer sur Atlas, et **pourquoi** chaque dépendance est nécessaire.
Elle complète le [workflow de contribution](./workflow.md) (qui décrit le
flux branche → PR → merge) en répondant à la question d'amont :
_comment obtenir un dépôt qui build et dont les hooks passent ?_

> Un _hook Git_ est un script lancé automatiquement par Git à certains
> moments (avant un commit, avant un push). Atlas les utilise pour
> vérifier le code avant qu'il ne parte. Voir [Hooks Git](../quality/hooks.md).

## Dépendances obligatoires

Deux outils suffisent à installer et faire tourner l'ensemble du
monorepo.

| Outil                             | Version       | Source de vérité                     | Rôle                                                                             |
| --------------------------------- | ------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| **[Node.js](https://nodejs.org)** | `>= 24` (LTS) | [`.nvmrc`](../../.nvmrc) → `24`      | Moteur JavaScript qui exécute le code et les outils                              |
| **[pnpm](https://pnpm.io)**       | `10.33.2`     | `packageManager` dans `package.json` | Gestionnaire de paquets qui installe les dépendances et isole chaque sous-projet |

La version de Node est **épinglée** dans [`.nvmrc`](../../.nvmrc). Avec
[`nvm`](https://github.com/nvm-sh/nvm) :

```bash
nvm install   # lit .nvmrc et installe/active la bonne version
nvm use
```

La version de pnpm est **épinglée** dans le champ `packageManager` du
`package.json` racine. Si [Corepack](https://nodejs.org/api/corepack.html)
est activé (`corepack enable`), la bonne version de pnpm est sélectionnée
automatiquement à la première commande `pnpm` lancée dans le dépôt — pas
d'installation manuelle.

> **Pourquoi ces versions sont strictes.** Le fichier
> [`.npmrc`](../../.npmrc) active `engine-strict=true` : `pnpm install`
> **échoue** si la version de Node ne satisfait pas le champ `engines`
> (`>= 24`). C'est volontaire — cela garantit que tout le monde, et la CI,
> construisent avec le même moteur, et évite les bugs « ça marche chez
> moi ».

## Installation

Une fois Node et pnpm en place :

```bash
git clone https://github.com/univ-lehavre/atlas.git
cd atlas
pnpm install
```

`pnpm install` réalise trois choses :

1. installe les dépendances de **tous** les sous-projets du monorepo
   (workspace pnpm) ;
2. déclenche le script `prepare`, qui lance `lefthook install` et **pose
   les hooks Git** locaux dans `.git/hooks` ;
3. applique le _hoisting_ de `@storybook/*` à la racine
   (voir [`.npmrc`](../../.npmrc)) pour que la CLI Storybook résolve ses
   paquets frères.

Vérifier que tout fonctionne :

```bash
pnpm ci:checks   # rejoue en local la séquence de la CI (format, lint, types, tests, build)
```

Voir [Pipeline CI](../quality/ci-pipeline.md) pour le détail de cette
commande.

## Dépendances optionnelles

Certains outils ne sont **pas obligatoires** : leur absence dégrade
l'expérience locale mais ne bloque pas, car la CI rattrape la
vérification correspondante sur la PR.

| Outil                                                    | Conséquence si absent                                                                                                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[gitleaks](https://github.com/gitleaks/gitleaks)** 8.x | Le hook _pre-commit_ passe en mode avertissement et **ne bloque pas** les commits contenant un secret ; la détection est alors déléguée à la CI ([`gitleaks.yml`](../../.github/workflows/gitleaks.yml)). |

Installer `gitleaks` localement est **fortement recommandé** : il vaut
mieux qu'un secret soit attrapé avant le commit que sur la PR.

L'installation dépend du système d'exploitation :

```bash
# macOS — via Homebrew (https://brew.sh)
brew install gitleaks

# Linux — via les paquets de la distribution, ou le binaire des releases
# https://github.com/gitleaks/gitleaks/releases

# Windows — via Scoop / Chocolatey, ou le binaire des releases
scoop install gitleaks
```

> **Note macOS.** Le hook _pre-commit_ et le hook _commit-msg_ utilisent
> la syntaxe BSD de `sed -i ''` (deux arguments), spécifique à macOS ; sur
> Linux (GNU `sed`), `sed -i` n'attend pas d'argument vide. L'équipe
> développe principalement sous macOS ; un contributeur sous Linux qui
> rencontre une erreur `sed` dans un hook peut le signaler par une
> [issue](https://github.com/univ-lehavre/atlas/issues) — la portabilité
> des hooks sera traitée au cas par cas.

## Variables d'environnement et secrets

Le développement local **n'a besoin d'aucun secret** : le monorepo
build, teste et lint sans token. Les jetons de registre npm
(`NPM_TOKEN`, `NODE_AUTH_TOKEN`) sont injectés **uniquement au moment de
la publication** par [`release.yml`](../../.github/workflows/release.yml),
et délibérément **absents** de [`.npmrc`](../../.npmrc) pour que `pnpm`
ne tente pas de les résoudre en local (sinon : avertissement `Failed to
replace env in config`).

Les applications qui nécessitent une configuration runtime (clés
d'API externes, par exemple) documentent leurs variables dans leur
propre `README.md` — l'information vit au niveau le plus spécifique qui
la contient (voir [politique de documentation](../quality/documentation.md)).

## Si quelque chose ne va pas

| Symptôme                                              | Cause probable                                    | Action                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm install` échoue avec une erreur de version Node | Node < 24 (`engine-strict`)                       | `nvm use` (lit `.nvmrc`), puis réessayer                                                                    |
| `pnpm` introuvable ou mauvaise version                | Corepack non activé                               | `corepack enable`, relancer la commande                                                                     |
| Les hooks Git ne se déclenchent pas                   | `prepare` non joué (clone partiel, hooks effacés) | `pnpm install` à nouveau, ou `pnpm exec lefthook install`                                                   |
| `gitleaks non installé localement` au commit          | dépendance optionnelle absente                    | installer gitleaks (`brew install gitleaks` sous macOS) ou ignorer — la CI couvre                           |
| Erreur `sed` dans un hook _commit-msg_                | GNU `sed` (Linux) au lieu de BSD `sed` (macOS)    | signaler par une [issue](https://github.com/univ-lehavre/atlas/issues) — portabilité traitée au cas par cas |

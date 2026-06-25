---
title: Première prise en main
---

Ce tutoriel te fait **lancer la documentation d'Atlas sur ta propre machine**, du
clonage du dépôt jusqu'au site qui s'affiche dans ton navigateur. Tu n'as besoin
d'aucune connaissance préalable du projet : on avance commande par commande, et à
la fin tu auras un résultat concret sous les yeux. Compte **environ 5 minutes**
(hors temps de téléchargement des dépendances).

On choisit la **documentation** comme premier objectif parce que c'est le parcours
le plus sûr : il ne demande ni Docker, ni base de données, ni mot de passe, et le
succès est **visible** (un site web s'ouvre). Lancer une application complète
viendra plus tard — voir les renvois en fin de page.

## Ce dont tu as besoin

Avant de commencer, trois outils doivent être installés sur ta machine.

- **[Git](/atlas/glossary/)** — l'outil qui récupère le code et son historique.
  Vérifie qu'il est présent : `git --version` doit répondre un numéro.
- **Node.js** — l'environnement qui exécute le code JavaScript hors du navigateur.
  Atlas demande la version **24.18.0** (fixée dans le fichier `.nvmrc` du dépôt).
  Vérifie : `node --version`. Si tu utilises **nvm** (un gestionnaire de versions
  de Node), `nvm install` puis `nvm use` dans le dossier du dépôt installe la bonne
  version automatiquement.
- **[pnpm](/atlas/glossary/)** — le gestionnaire de paquets du projet (il installe
  les bibliothèques dont le code dépend), en version **10.33.2**. Le plus simple est
  de laisser **Corepack** (livré avec Node) s'en charger : `corepack enable`. pnpm
  sera alors installé à la bonne version au premier usage.

Tu n'as **pas** besoin de Docker ni d'un quelconque secret pour ce tutoriel.

## Étape 1 — Récupérer le dépôt

**Cloner** un dépôt, c'est en télécharger une copie complète sur ta machine. Dans un
terminal, place-toi là où tu ranges tes projets, puis :

```sh
git clone https://github.com/univ-lehavre/atlas.git
cd atlas
```

Tu es maintenant **dans** le dossier du projet (`cd` = _change directory_). Toutes
les commandes suivantes se lancent depuis cet endroit.

## Étape 2 — Installer les dépendances

Le projet s'appuie sur de nombreuses bibliothèques externes ; cette commande les
télécharge et les range, pour tous les sous-projets du monorepo à la fois :

```sh
pnpm install
```

La première fois, c'est l'étape la plus longue (téléchargement). C'est normal. Si
la commande refuse de s'exécuter en se plaignant de la version de Node, reviens à la
section [« Ce dont tu as besoin »](#ce-dont-tu-as-besoin) : Atlas **exige** la bonne
version (par sécurité, l'installation échoue plutôt que de continuer sur une version
non testée).

## Étape 3 — Lancer la documentation

Cette commande démarre le site de documentation en **mode développement** : il se
construit, se sert localement, et se recharge à chaque modification.

```sh
pnpm docs:dev
```

Au bout de quelques secondes, le terminal affiche une adresse locale, en général
**`http://localhost:4321/atlas/`**. Laisse cette commande tourner (elle occupe le
terminal tant que le site est servi).

## Étape 4 — Vérifier que ça marche

Ouvre l'adresse affichée dans ton navigateur. Tu dois voir la page d'accueil de la
documentation d'Atlas, avec sa **barre latérale** à gauche (les groupes
« Apprendre », « Faire », « Consulter », « Comprendre »).

Pour confirmer que tu édites bien **ta** copie locale : ouvre le fichier
`docs/src/content/docs/index.mdx` dans un éditeur de texte, change un mot de la page
d'accueil, et enregistre. Le navigateur se **met à jour tout seul**, sans recharger
la page. Si tu vois ton changement apparaître : c'est gagné. (Annule la modification
ensuite si tu ne veux pas la garder.)

Pour arrêter le serveur, reviens au terminal et appuie sur `Ctrl + C`.

## Et maintenant ?

Tu sais récupérer le dépôt, l'installer et faire tourner la doc en local. Pour aller
plus loin, ces pages prennent le relais :

- **Contribuer un changement** (créer une branche, ouvrir une _pull request_) :
  [Travailler ensemble](/atlas/collaboration/workflow/).
- **Préparer un environnement complet** (lancer une application, les tests, les
  contrôles qualité) : [Environnement local](/atlas/collaboration/environnement-local/).
- **Comprendre comment le projet est organisé** :
  [Structure du monorepo](/atlas/architecture/monorepo/).

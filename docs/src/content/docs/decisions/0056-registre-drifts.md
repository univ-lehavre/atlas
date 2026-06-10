---
title: "0056 — Registre de drifts : catalogue indexé des écarts révélés à l'exécution"
---

## Contexte

Les tests unitaires et le _lint_ (analyse statique du code) ne voient pas tout.
Certains écarts n'apparaissent qu'à **l'exécution**, lors d'un _run end-to-end_
(test complet du système dans des conditions réalistes, sur le banc) : le
développement du pipeline DataOps (ingestion OpenAlex par Dagster) en a accumulé
plusieurs — une variable d'environnement requise par l'orchestrateur mais ignorée
des tests, un outil qui renvoie un succès là où on attendait une erreur, un
listing prohibitif à l'échelle réelle de la source, un déploiement GitOps non
récursif. Un bug subtil (perte silencieuse de données) n'a, lui, été trouvé que
par **revue de code adversariale**.

On appelle **drift** un tel écart révélé au run, invisible au lint et aux tests ;
et **piège de revue** un bug subtil identifié en revue de code, pas au run. Ces
trouvailles étaient jusqu'ici résolues au fil de l'eau **sans être consignées** :
leur leçon se perdait dans l'historique git.

Le dépôt voisin `cluster` a déjà résolu ce problème avec un **registre de drifts**
(catalogue YAML indexé, cadré par ses ADR cluster
[0034](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0034-validation-e2e-from-scratch.md)
« validation e2e from scratch » et
[0042](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0042-fraicheur-preuves-banc.md)
« fraîcheur des preuves banc »). Atlas n'a pas d'équivalent. Cet ADR en crée un.

## Décision

> **Atlas tient un registre de drifts unique et transverse : un catalogue indexé
> des écarts révélés à l'exécution et des pièges de revue marquants. Source de
> vérité YAML, rendu en page de documentation, alimenté dans la PR du correctif.**

### Un registre unique, transverse à tout le dépôt

Un seul registre couvre **tout** atlas (pas seulement `dataops/`), comme côté
cluster : un drift d'app, de service, de CI ou de DataOps y a sa place. Cela évite
l'éparpillement et fait de ce fichier le point d'entrée unique de la mémoire des
écarts.

### Critère d'entrée : drifts e2e + pièges de revue marquants

Entrent au registre **deux natures** d'écarts, distinguées par un champ `nature` :

- **`drift-e2e`** — révélé à l'exécution (run e2e), invisible au lint et aux tests.
- **`piege-revue`** — bug subtil trouvé en revue de code (souvent adversariale),
  pas au run.

On ne consigne que les écarts **marquants** (porteurs d'une leçon réutilisable),
pas chaque bug trivial corrigé en passant — ce jugement relève de la revue.

### Format : YAML source de vérité + rendu MDX

Le registre est un fichier **YAML** machine-lisible
(`docs/src/content/drifts/registre-drifts.yaml`), rendu en tableau par une page de
documentation. Le YAML est chargé comme une **_content collection_ Astro** (le
loader `file()` parse le YAML **nativement** — aucune dépendance ajoutée) et
validé par un **schéma de types** (`zod`). C'est le garde-fou : `pnpm docs:build`
échoue si une entrée est malformée (champ manquant, valeur hors énumération,
identifiant non conforme), sans aucun script d'audit dédié à maintenir.

Alternatives écartées : ajouter un plugin Vite `@rollup/plugin-yaml` ou importer
le YAML directement en MDX — toutes deux imposeraient une dépendance nouvelle, là
où le loader natif d'Astro suffit. Une page Markdown manuelle (tableau saisi à la
main) a aussi été écartée : elle perdrait le caractère machine-lisible et le
garde-fou de validation.

### Schéma d'une entrée

Chaque entrée porte : `id` (`Dnn`, stable et citable) ; `campagne` (chantier ou
issue qui l'a révélé) ; `nature` (`drift-e2e` ou `piege-revue`) ; `portee`
(`code` = défaut du livrable, vaut pour la production ; `env` = artefact d'un banc
précis ; `harnais` = outillage de test) ; `symptome` ; `cause` (racine) ;
`correctif` ; `statut` (`corrige`, `ouvert` ou `caduc`).

### Où il vit et qui l'alimente

Le YAML vit sous `docs/src/content/drifts/` (hors des pages servies) ; la page de
rendu sous `docs/src/content/docs/audit/` (famille « constats vérifiés »). Le
registre est alimenté par **l'auteur de la PR qui corrige** un drift ou un piège,
**dans la même PR que le correctif** — discipline alignée sur l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
(« un changement se reflète dans la même PR »).

## Statut

Accepted (2026-06-10). Inspiré des ADR cluster 0034 et 0042 (registre de drifts
côté infrastructure). N'amende aucun ADR atlas — c'est un nouveau dispositif.

## Conséquences

**Bénéfices.** La mémoire des écarts devient **indexée et citable** (`Dnn`) au lieu
de se diluer dans l'historique git. Le registre est **rendu et lisible** dans la
documentation, pas seulement machine-lisible. Le **schéma de validation** garantit
la cohérence au build. Aucune dépendance nouvelle (le loader Astro parse le YAML
nativement).

**Prix à payer.** L'alimentation est une **discipline manuelle** (une entrée à
rédiger dans la PR du correctif). Une _content collection_ de plus à maintenir. Le
YAML doit rester un **tableau de premier niveau** (contrainte du loader `file()`),
pas un objet enveloppant.

**Garde-fous.**

- Le schéma `zod` de la collection valide chaque entrée au build : `docs:build`
  (et donc la CI) échoue si le registre est malformé.
- Une entrée par drift/piège **dans la PR du correctif**, jamais après coup.
- La pertinence (« marquant ») relève de la **revue humaine** ; le registre n'est
  pas un journal exhaustif de tous les bugs.
- Les identifiants `Dnn` sont **stables** : on ne réutilise ni ne renumérote.

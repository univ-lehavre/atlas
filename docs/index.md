---
layout: home

hero:
  name: Atlas
  text: Un dépôt, plusieurs projets, une chaîne de qualité commune
  tagline: Plusieurs projets logiciels dans un seul dépôt Git.<br>Applications, bibliothèques, serveurs, outils en ligne de commande.<br>Mêmes règles, même chaîne de qualité.<br>Cette organisation est appelée monorepo.
  actions:
    - theme: brand
      text: Je découvre
      link: /architecture/monorepo
    - theme: alt
      text: Je veux lire le code
      link: /architecture/comprendre-le-code

features:
  - title: Je découvre
    details: Comprendre ce que fait le dépôt et comment il est organisé, sans prérequis technique. Les huit catégories, les garde-fous qualité, la manière de collaborer.
    link: /architecture/monorepo
  - title: Je veux lire le code
    details: Entrer dans le code par le bon endroit. Par où commencer selon ce qu'on cherche, quels paquets lire ensemble, comment une donnée circule.
    link: /architecture/comprendre-le-code
  - title: La carte des paquets
    details: Pour chaque paquet — son rôle, ce dont il dépend, qui le consomme. Générée depuis le code, donc toujours à jour.
    link: /architecture/packages
  - title: La référence API
    details: Les signatures publiques (fonctions, types) de chaque paquet, générées par TypeDoc à partir du code. En anglais, niveau expert.
    link: /api/
---

## Deux entrées, selon ce que tu cherches

Cette documentation sert deux publics. Choisis ta porte d'entrée.

### Je découvre — pour comprendre, sans coder

Rédigée pour un public **non-expert** : quand un terme technique apparaît, il est
défini sur place ou renvoie au [glossaire](/glossary).

| Pour savoir…                  | Va voir                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| comment le dépôt est organisé | [Structure du monorepo](/architecture/monorepo)                          |
| ce qui garantit la qualité    | [Pipeline CI](/quality/ci-pipeline), [tests](/quality/tests)             |
| ce qui garantit la sécurité   | [Sécurité](/quality/security)                                            |
| comment on collabore          | [Workflow](/collaboration/workflow), [releases](/collaboration/releases) |
| comment on documente          | [Politique de documentation](/quality/documentation)                     |

### Je veux lire le code — pour l'expert info/data

Pour un **développeur ou data scientist** qui veut se faire une idée du code sans
tout lire.

| Pour…                                      | Va voir                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| savoir **par où entrer** dans le code      | [Comprendre le code](/architecture/comprendre-le-code) |
| voir **qui fait quoi / qui dépend de qui** | [Carte des paquets](/architecture/packages)            |
| suivre **le parcours d'une donnée**        | [Flux de données](/architecture/data-flow)             |
| lire les **signatures publiques**          | [Référence API](/api/)                                 |
| comprendre **le _pourquoi_ d'un choix**    | [Décisions (ADR)](/decisions/)                         |

> **Pourquoi cette doc reflète fidèlement le code.** La carte des paquets et la
> référence API sont **générées depuis le code** et vérifiées à jour à chaque
> intégration ; les pages rédigées sont **auditées** (liens, références, pages
> orphelines). Une doc qui dérive du code casse la CI — voir
> [ADR 0028](/decisions/0028-documentation-verifiable).

Si quelque chose n'est pas clair, [ouvre une issue](https://github.com/univ-lehavre/atlas/issues) — la documentation est une responsabilité partagée.

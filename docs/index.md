---
layout: home

hero:
  name: Atlas
  text: Un dépôt, plusieurs projets, une chaîne de qualité commune
  tagline: Plusieurs projets logiciels dans un seul dépôt Git.<br>Applications, bibliothèques, serveurs, outils en ligne de commande.<br>Mêmes règles, même chaîne de qualité.<br>Cette organisation est appelée monorepo.
  actions:
    - theme: brand
      text: Découvrir le monorepo
      link: /architecture/monorepo
    - theme: alt
      text: Les garde-fous qualité
      link: /quality/ci-pipeline

features:
  - title: Structure
    details: Sept catégories — apps, packages, services, cli, ui, config, sandbox — une responsabilité par catégorie. Le placement d'un projet dans le dépôt indique d'emblée son rôle.
    link: /architecture/monorepo
  - title: Garde-fous qualité
    details: TypeScript strict, ESLint, Prettier, vérification de types, formatage automatique, conventions de commit. Chaque modification passe par la même série de contrôles.
    link: /quality/code-style
  - title: Sécurité
    details: Détection de secrets, analyse statique (CodeQL), scan dynamique (OWASP ZAP), inventaire de dépendances (SBOM), audits npm et licences, releases signées par OIDC.
    link: /quality/security
  - title: Collaboration
    details: Pull request, conventions de commit, hooks Git locaux qui bloquent en avance ce qui échouerait en CI, releases automatisées par Changesets.
    link: /collaboration/workflow
---

## Pour qui est cette documentation

Cette documentation est rédigée pour être lisible par un public non-expert, qu'il ou elle code ou non. Quand un terme technique est introduit, il est défini sur place ou renvoie au [glossaire](/glossary).

Elle décrit :

- **comment le dépôt est organisé** (la [structure du monorepo](/architecture/monorepo)),
- **les garde-fous qui assurent la qualité et la sécurité** ([pipeline CI](/quality/ci-pipeline), [tests](/quality/tests), [sécurité](/quality/security), [hooks Git](/quality/hooks)),
- **comment on collabore** dessus ([workflow](/collaboration/workflow), [releases](/collaboration/releases)).

Si quelque chose n'est pas clair, [ouvre une issue](https://github.com/univ-lehavre/atlas/issues) — la documentation est une responsabilité partagée.

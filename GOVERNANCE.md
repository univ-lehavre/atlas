# Gouvernance

> 🇬🇧 **In English.** This document describes how decisions are made in Atlas. The
> project is currently **single-maintainer** (bus factor = 1, an assumed and
> documented state). Governance rules below are written in French (the maintaining
> team's language); contributions in English are welcome.

Ce document décrit **comment les décisions sont prises** dans Atlas — qui décide,
selon quel processus, et comment le projet est repris en cas d'absence du
mainteneur. Il **consolide** des règles déjà tracées en ADR ; il ne les remplace
pas.

## Modèle de décision

Atlas est aujourd'hui un projet **à mainteneur unique** (_bus factor_ = 1). C'est
un état **assumé et documenté**, pas un objectif — il conditionne plusieurs choix
de gouvernance (voir [posture sur les paliers Best Practices](docs/src/content/docs/decisions/0086-posture-paliers-best-practices.md)).

- **Décisions structurantes** (architecture, conventions, périmètre) : prises via
  un **ADR** (format Nygard léger) dans
  [`docs/src/content/docs/decisions/`](docs/src/content/docs/decisions/). Un ADR
  acté n'est pas réécrit : il est _superseded_ ou _amendé_ par un nouvel ADR.
- **Décisions courantes** (correctifs, dépendances, documentation) : prises au fil
  des **pull requests**, sous les garde-fous automatiques (CI, hooks).
- **Toute modification** passe par une **branche dédiée** puis une **PR** : aucun
  commit direct sur `main`
  ([ADR 0016](docs/src/content/docs/decisions/0016-branch-protection-main.md)).
  `main` n'accepte que des **merge commits**
  ([ADR 0053](docs/src/content/docs/decisions/0053-strategie-merge-commit-main.md)),
  et `enforce_admins` est actif : le mainteneur lui-même est soumis aux contrôles.

## Rôles

| Rôle              | Titulaire                                       | Détail                                                                               |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Mainteneur        | voir [`.github/CODEOWNERS`](.github/CODEOWNERS) | Revue, merge, releases, arbitrage des ADR.                                           |
| Security champion | **vacant**                                      | Rôle ouvert ([ADR 0027](docs/src/content/docs/decisions/0027-security-champion.md)). |
| Organisation      | `univ-lehavre`                                  | Propriétaire du dépôt ; continuité d'accès si le mainteneur est absent.              |

## Contribuer à une décision

- Proposer une **évolution** : ouvrir une [issue](https://github.com/univ-lehavre/atlas/issues)
  (`enhancement`) ou une [discussion](https://github.com/univ-lehavre/atlas/discussions).
- Proposer une **décision structurante** : ouvrir une PR ajoutant un **ADR**
  (numéro = suivant libre), qui sera arbitré par le mainteneur.
- Le détail du workflow de contribution est dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Continuité

Le dépôt appartient à l'organisation **`univ-lehavre`**, qui conserve l'accès
administratif indépendamment du mainteneur. En cas d'indisponibilité durable du
mainteneur unique, l'organisation peut désigner un nouveau mainteneur. _Un plan de
succession nominatif (second administrateur) reste à formaliser — voir la posture
sur la continuité d'accès dans [ADR 0086](docs/src/content/docs/decisions/0086-posture-paliers-best-practices.md)._

## Code de conduite

Les interactions sont régies par le [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

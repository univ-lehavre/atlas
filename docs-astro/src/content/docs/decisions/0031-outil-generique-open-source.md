---
title: "0031 — Outil générique open-source : contribution inter-établissements"
---

## Contexte

Le pipeline de recommandation de collaborations
([ADR 0029](0029-architecture-pipeline-collaborations)) a d'abord été pensé
pour l'établissement qui le développe. Mais plusieurs choix déjà actés n'ont de
sens que si l'outil est **générique et destiné à être repris** :

- le dépôt `atlas` est **public** sous licence **MIT** ;
- la documentation vise un **public non-expert** et **neutralise le framing
  institutionnel** ([ADR 0013](0013-documentation-public-non-expert-fr),
  [ADR 0012](0012-neutralisation-framing-institutionnel)) ;
- les paquets sont **publiés** (npm OIDC,
  [ADR 0017](0017-releases-npm-oidc-deux-registres)) sous un nommage
  **générique sans marque** ([ADR 0022](0022-naming-convention), convention
  `citation` plutôt qu'`openalex`) ;
- le traitement RGPD est **multi-tenant** : chaque établissement exploite sa
  propre instance dont il est responsable de traitement
  ([ADR 0030](0030-rgpd-profilage-collaborations)), et l'utilisateur **déclare
  ses propres alliances** comme filtre d'affichage.

Le constat qui force la décision : **un dépôt public, une licence MIT et un soin
DevSecOps poussé (CI, signature d'images, documentation vérifiable, ADR) ne se
justifient que pour un projet destiné à être repris par d'autres.** Sur un outil
interne jetable, cet investissement serait de la sur-ingénierie ; sur un outil
**communautaire**, c'est le minimum vital pour inspirer confiance et permettre la
contribution. Inversement, garder l'outil spécifique à un seul établissement
rendrait le caractère public du dépôt incohérent.

Sans décision explicite, cette vocation reste implicite — au risque que des choix
futurs la contredisent (couplage à une institution, identifiants de marque,
hypothèse d'un responsable de traitement unique).

## Décision

> **L'outil est générique, open-source et conçu pour la contribution
> inter-établissements.** Aucun composant n'est couplé à un établissement
> particulier ; tout établissement (ou alliance) peut déployer sa propre
> instance, en être responsable de traitement, et contribuer au code — quel que
> soit son établissement d'origine. Le premier déploiement (celui de
> l'établissement développeur) n'est **pas** un cas privilégié, mais une instance
> parmi d'autres.

Cet ADR **explicite et fédère** une vocation jusqu'ici implicite. Il ne crée pas
de nouvelle contrainte technique : il **nomme le pourquoi** qui justifie, en
amont, le dépôt public, la licence MIT, le soin DevSecOps, le nommage générique
et le modèle multi-tenant déjà actés ailleurs.

### Conséquences sur la conception (invariants)

- **Aucun couplage institutionnel dans le code.** Pas d'identifiant
  d'établissement, de marque, d'URL ou d'hypothèse mono-tenant codés en dur. Ce
  qui est propre à une instance (établissement responsable, périmètre
  d'ingestion, base légale, branding) est **configuration**, pas code. Prolonge
  [ADR 0022](0022-naming-convention) (pas de marque dans les identifiants) et
  [ADR 0012](0012-neutralisation-framing-institutionnel).
- **Multi-tenant by-design.** Une instance = un établissement responsable de
  traitement (cf. [ADR 0030](0030-rgpd-profilage-collaborations)). Le code ne
  présuppose pas un responsable unique ni un périmètre fixe.
- **Le soin DevSecOps est une fonctionnalité, pas un luxe.** CI, tests, audits,
  documentation vérifiable ([ADR 0028](0028-documentation-verifiable)),
  signature d'images (à venir) servent la **reprenabilité** par des
  contributeurs et déployeurs tiers. C'est ce qui rend le dépôt public crédible.
- **Contribution ouverte, sans condition d'appartenance.** Un développeur de tout
  établissement peut contribuer. La gouvernance de contribution est formalisée à
  la racine : [`CONTRIBUTING.md`](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md) (flux, conventions, CLA
  léger MIT) et [`CODE_OF_CONDUCT.md`](https://github.com/univ-lehavre/atlas/blob/main/CODE_OF_CONDUCT.md) (Contributor
  Covenant v2.1), avec un canal de signalement confidentiel via
  [`SECURITY.md`](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md).

## Statut

Accepted (2026-06-02). Étend
[ADR 0012](0012-neutralisation-framing-institutionnel),
[ADR 0013](0013-documentation-public-non-expert-fr) et
[ADR 0022](0022-naming-convention) sans les remplacer ; cadre le modèle
multi-tenant de [ADR 0030](0030-rgpd-profilage-collaborations).

## Conséquences

**Bénéfices.** La vocation open-source a un **lieu de décision écrit** : les choix
coûteux (dépôt public, DevSecOps, généricité) cessent d'être discutables au coup
par coup, ils servent un objectif acté. L'outil peut être **adopté par plusieurs
alliances** sans réécriture, et **attirer des contributions** au-delà de
l'établissement développeur — ce qui est la raison d'être d'un dépôt public.
Pour le positionnement, c'est un démonstrateur **communautaire** (repris,
déployé, contribué) plutôt qu'un outil interne invisible.

**Prix à payer.** La généricité **interdit les raccourcis** spécifiques à un
établissement (pas de valeur codée en dur, tout en configuration) — un coût de
conception permanent. Ouvrir à la contribution suppose une **gouvernance** à
tenir dans la durée (revue, accueil des contributeurs, décisions partagées) :
`CONTRIBUTING.md` et `CODE_OF_CONDUCT.md` posent le cadre, mais le faire **vivre**
reste un effort continu. Le multi-tenant déporte la responsabilité de traitement
sur **chaque**
déployeur, qui doit faire son propre arbitrage RGPD (cf.
[ADR 0030](0030-rgpd-profilage-collaborations)) — l'outil ne dispense personne
de sa conformité.

**Garde-fous.**

- Tout couplage institutionnel introduit dans le code (identifiant, marque, URL,
  hypothèse mono-tenant) est un **écart** à signaler en revue — la configuration
  est le seul réceptacle du spécifique.
- La **licence reste permissive** (MIT) ; tout changement de licence rouvre cet
  ADR.
- La gouvernance de contribution est en place
  ([`CONTRIBUTING.md`](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md),
  [`CODE_OF_CONDUCT.md`](https://github.com/univ-lehavre/atlas/blob/main/CODE_OF_CONDUCT.md)) ; la **tenir à jour** (scopes,
  flux, canaux) au fil de l'évolution du projet est un garde-fou continu.
- La neutralité de framing ([ADR 0012](0012-neutralisation-framing-institutionnel))
  et le nommage générique ([ADR 0022](0022-naming-convention)) restent les
  garde-fous opérationnels de la généricité.

---
title: "0070 — Page de preuves (vitrine d'orientation) et doctrine des badges admissibles"
---

## Contexte

Atlas accumule des **forces réelles**, mais **sous-exposées** : un visiteur — contributeur,
évaluateur, futur déployeur — ne les voit nulle part rassemblées. Elles sont câblées dans le
code, tracées dans les ADR, vérifiées en intégration continue (_CI_, vérifications automatiques
à chaque modification), mais **éparpillées** : il faut connaître le dépôt pour savoir qu'elles
existent. Quelques exemples de ce qui est **déjà vrai aujourd'hui** et reste invisible de
l'extérieur :

- **Accessibilité WCAG 2.x AA mécanisée.** Le niveau visé (_WCAG_ — _Web Content Accessibility
  Guidelines_, référentiel d'accessibilité du web ; **AA** = le palier attendu par le RGAA et la
  norme EN 301 549) est **épinglé dans les tests** (config axe partagée `wcagAxeOptions`), pas
  laissé au défaut implicite d'un outil ([ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/)).
- **SLA de remédiation chiffrés.** Les failles sont classées par sévérité avec un **délai cible
  de fermeture** (Critical 7 j, High 30 j, Medium 90 j — _SLA_, _Service Level Agreement_, engagement
  de niveau de service), [ADR 0018](/atlas/decisions/0018-sla-remediation-findings/).
- **Runbook d'incident opérationnel.** Une procédure concrète de réponse à incident, avec grille
  de sévérité P0–P3 (`docs/quality/incident-response.md`).
- **RGPD applicatif câblé.** Le périmètre est tracé ([ADR 0026](/atlas/decisions/0026-rgpd-perimetre/))
  et un **droit d'opposition** au profilage est implémenté au grain `(author_id, work_id)`
  ([ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)).
- **Surveillance de modèle (MLOps).** Suivi de dérive et **porte de sécurité** sur le modèle
  d'uplift : un modèle qui perd son pouvoir prédictif **arrête** le pipeline
  ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/),
  [ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/),
  [ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/)).
- **Déterminisme documentaire à l'octet.** Ce qui est dérivable du code est **généré, commité et
  comparé octet par octet en CI** ; ce qui ne l'est pas est historisé en _append-only_, sans
  jamais mentir ([ADR 0028](/atlas/decisions/0028-documentation-verifiable/),
  [ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/)).

Le dépôt jumeau **cluster** (l'infrastructure qui héberge Atlas) a résolu le même problème par une
**page de preuves** (`docs/preuves.md`) : une vitrine d'orientation qui consolide les forces du
projet, **pointe vers la trace brute** (le test, l'ADR, le workflow) et **ne recopie rien**. Atlas
n'a pas son équivalent. Symétriquement, un autre besoin émerge — **mettre une rangée de badges**
au `README.md` racine pour signaler ces forces d'un coup d'œil — mais un badge mal posé devient un
**mensonge** : « build passing » sans CI, « coverage 92 % » recopié à la main. Les deux besoins
(vitrine et badges) partagent une même exigence : **n'exposer que du vrai, vérifiable**.

Sans décision, chaque ajout (un paragraphe de vitrine, un badge) rejouerait l'arbitrage « honnête ?
pertinent ? où ? ». Il faut une vitrine cadrée et une doctrine opposable en revue.

## Décision

> **Atlas se dote d'une page de preuves — une vitrine d'orientation qui consolide ses forces
> réelles, POINTE vers la trace brute sans rien recopier. Un badge n'est posé au README que s'il
> reflète un état VRAI et vérifiable. La page assume aussi, par honnêteté, ce qui n'est pas encore
> là.**

### 1. Une page de preuves qui oriente, ne duplique pas

La page (`docs/quality/preuves.md`, inspirée de la pratique du dépôt cluster) **liste les forces
établies du dépôt** et, pour chacune, **renvoie à la preuve la plus dure disponible** — l'ADR qui
la décide, le test qui la vérifie, le workflow CI qui l'exécute, le runbook qui l'opère. Elle est
une **table d'orientation**, pas une copie : elle **ne recopie jamais** un chiffre, un seuil, un
extrait de code ou de doc. _Pourquoi ?_ Recopier, c'est créer une **deuxième source de vérité** qui
dérive : le chiffre figé périme, le seuil recopié contredit le code. La règle **R8 de la charte
rédactionnelle** ([ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)) exige
déjà que les pages catalogue pointent vers la source plutôt que de la dupliquer ; la page de
preuves est l'application directe de cette règle à l'échelle du dépôt. Concrètement, elle regroupe
les forces par familles :

- **Accessibilité** → [ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/) +
  [page Accessibilité](/atlas/quality/accessibilite/).
- **Sécurité & remédiation** → [ADR 0018](/atlas/decisions/0018-sla-remediation-findings/) +
  [page Sécurité](/atlas/quality/security/) + runbook `incident-response.md`.
- **RGPD applicatif** → [ADR 0026](/atlas/decisions/0026-rgpd-perimetre/) +
  [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/).
- **Fiabilité ML** → [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) +
  [ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) +
  [ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/).
- **Déterminisme documentaire** → [ADR 0028](/atlas/decisions/0028-documentation-verifiable/) +
  [ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/).

### 2. Doctrine des badges admissibles

La vitrine déborde au `README.md` racine sous forme d'une **rangée de badges**, soumise à une règle
simple : **un badge n'est affiché que s'il est honnête**, c'est-à-dire si **l'une** des deux
conditions tient — exactement la distinction posée par [ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
et [ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/) entre _généré déterministe_ et
_snapshot honnête_ :

- **Dynamique & câblé** : servi par un outil réellement branché qui **recalcule** l'état (badge
  d'état d'un workflow GitHub Actions comme `ci.yml`, badge de couverture alimenté par une mesure
  réelle). L'état affiché **est** l'état courant, à tout instant.
- **Statique mais factuel & stable** : pointe une vérité **non datée et invariante** — la licence
  MIT ; le **DOI** (_Digital Object Identifier_, identifiant pérenne, ici l'archive Zenodo du
  dépôt) ; la conformité à une convention **réellement appliquée et outillée** (Conventional
  Commits, [ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints/)). Un badge
  statique ne porte **jamais** un score ou un palier susceptible de bouger : pas de « coverage 87 % »
  figé à la main.

Un référentiel **noté dont l'outil n'est pas câblé n'a pas de badge** — il reste un finding d'audit
(issue `enhancement`) jusqu'à son câblage. _Pourquoi cette sévérité ?_ Un badge faux est **pire**
qu'un badge absent : il fait croire à une garantie inexistante et ruine la confiance dans toute la
rangée. La rangée est **ordonnée par famille** (identité & licence → conventions & versionnement →
qualité & CI → sécurité & chaîne d'approvisionnement), un commentaire HTML au point d'insertion
rappelant la règle ; l'ordre **est une règle**, il dit quelles familles de qualité le dépôt
revendique. Cette section est **repliée** : elle cadre les badges sans en imposer aucun aujourd'hui.

### 3. Ligne d'honnêteté : « ce que nous n'avons pas encore »

La page de preuves se **termine** par une rubrique courte et assumée listant les forces **pas encore
acquises** — par exemple : couverture de tests non publiée sous badge dynamique faute d'outil câblé ;
note automatisée de bonnes pratiques de sécurité non branchée. _Pourquoi l'écrire ?_ Une vitrine qui
ne montre que ses réussites est un **registre promotionnel**, ce que le dépôt proscrit
([ADR 0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/)) ; nommer ses manques rend
la page **crédible** et donne au lecteur une carte exacte. Chaque manque a un **critère de clôture**
clair (« devient une preuve / un badge quand l'outil tourne »), pas une promesse vague.

### Neutralité (prérequis Atlas)

Page comme badges respectent la **neutralité de domaine** ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/),
[ADR 0022](/atlas/decisions/0022-naming-convention/)) : on expose des familles de qualité
**génériques** (accessibilité, sécurité, RGPD, déterminisme), jamais un badge ou une vitrine qui
ancrerait le dépôt dans un domaine métier, une marque ou un établissement. Citer un outil réellement
intégré (axe-core, CodeQL, Zenodo) en **description** reste légitime — la nuance 2 de
[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/) ; ce qui est proscrit, c'est qu'un badge
**qualifie le dépôt entier** par un domaine.

## Alternatives écartées

- **Recopier les preuves dans la page** (chiffres, seuils, extraits). Écarté : crée une deuxième
  source de vérité qui dérive et périme en silence — exactement ce que
  [ADR 0028](/atlas/decisions/0028-documentation-verifiable/) et la R8 de
  [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) interdisent. La page
  **oriente**, elle ne duplique pas.
- **Tout badge dès qu'il existe en amont** (« si un badge existe, on l'affiche »). Écarté : ouvre au
  badge décoratif, qui ment sur l'état ; le badge le plus visible serait alors le plus faux.
- **Badge de score figé recopié à la main.** Écarté : un palier recopié périme en silence ; un badge
  de score **doit** être dynamique ou ne pas exister.
- **Une vitrine sans rubrique de manques.** Écarté : elle glisserait vers le registre promotionnel
  banni par [ADR 0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/) et perdrait sa
  crédibilité.

## Statut

Proposed.

## Conséquences

**Bénéfices.**

- **Des forces enfin visibles.** Accessibilité AA mécanisée, SLA chiffrés, runbook, RGPD câblé,
  porte de sécurité ML, déterminisme à l'octet : un visiteur les découvre en une page, chacune
  reliée à sa preuve dure.
- **Une page qui ne ment pas et ne dérive pas.** En pointant la trace brute sans la recopier, la
  vitrine reste vraie **par construction** : la preuve évolue, la page suit le lien, rien à
  re-synchroniser.
- **Une rangée de badges crédible.** Tout badge affiché est soit recalculé en continu, soit une
  vérité stable ; le lecteur peut s'y fier.
- **Une honnêteté qui renforce.** Nommer ce qui manque, avec un critère de clôture, vaut mieux que
  le masquer : la page gagne la confiance qu'une vitrine flatteuse perd.

**Prix à payer.** Un **jugement humain** reste requis à chaque ajout (preuve admissible ? badge
dynamique ou stable ? manque ou acquis ?) : la doctrine **cadre**, elle n'automatise pas. Certaines
fiertés réelles (couverture élevée) ne peuvent être affichées en badge tant qu'un outil **dynamique**
n'est pas câblé — afficher un chiffre figé serait précisément le travers banni. La page exige une
**maintenance légère** : un lien qui se renomme doit être suivi (la R8 de
[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) et l'audit doc aident à le
détecter).

**Garde-fous.**

- **En revue de PR**, une preuve recopiée plutôt que liée, un badge décoratif, un badge de score
  figé à la main, ou un badge hors de sa famille est refusé avant merge.
- **Aucune duplication de source** : la page **pointe**, elle ne recopie pas (R8,
  [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)).
- **Aucun badge ne porte de score recopié manuellement** : un palier est **dynamique ou inexistant**.
- **Neutralité vérifiée** : une vitrine ou un badge qui ancrerait le dépôt dans une marque, un
  domaine ou un établissement est signalé au titre de
  [ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/).
- **OpenSSF Scorecard** (note automatisée de bonnes pratiques de sécurité, projet de l'_Open Source
  Security Foundation_) reste **hors périmètre tant qu'il n'est pas câblé** : il pourra **revenir un
  jour** comme conséquence de cette doctrine — une famille « sécurité » avec une place réservée pour
  quand le workflow `scorecard.yml` tournera —, **sans être requis** ici. Il n'est mentionné que comme
  illustration de la règle 2 (badge seulement si câblé), pas comme engagement.

```

```

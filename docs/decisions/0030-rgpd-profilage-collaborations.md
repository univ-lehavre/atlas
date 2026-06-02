# 0030 — Profilage de collaborations : gate RGPD et bornage au consentement

## Contexte

L'[ADR 0029](0029-architecture-pipeline-collaborations.md) pose l'architecture
d'un pipeline mensuel qui dérive, depuis les données bibliographiques publiques
d'OpenAlex, un **mart de paires de chercheurs** (table de fait associant deux
personnes nommées, assortie de features de proximité et d'un score de
collaboration) servi par `atlas-api` à la PWA `find-an-expert` sous forme de
**recommandations nominatives** (« tel chercheur est un partenaire pertinent »)
accompagnées d'un résumé explicatif.

Un tel mart n'est pas une simple agrégation de données publiques. Il associe des
personnes physiques identifiées, calcule un score d'affinité entre elles et
restitue des recommandations individualisées : c'est un **traitement de données
à caractère personnel** et, très probablement, un **profilage** au sens de
l'article 4 du RGPD. Le scoring nominatif d'individus et la production de
recommandations les concernant placent par ailleurs le dispositif dans le champ
d'attention de l'**EU AI Act** (information des personnes, droit d'opposition à
un traitement automatisé).

L'[ADR 0026](0026-rgpd-perimetre.md) a acté que le périmètre RGPD vit **hors du
dépôt** (politique institutionnelle, pas du code) et a laissé en **questions
ouvertes** le responsable de traitement (Q6) et le sort des données collectées
par les apps déployées (Q2). Cette même décision pose un garde-fou explicite :
« la collecte d'un nouveau type de donnée personnelle par une app déployée
rouvre cette décision ». **Le pipeline de l'ADR 0029 est exactement ce
déclencheur** — il ne se contente pas de réutiliser une donnée existante, il
construit une donnée personnelle nouvelle (le lien profilé entre deux personnes)
et l'expose.

Trois faits techniques cadrent la suite :

- **Le dispositif de consentement existe déjà.** `find-an-expert` embarque un
  journal d'événements de consentement immuable (octroi/révocation horodatés),
  un état courant par personne, un `ConsentType` dédié à l'usage de l'email
  OpenAlex, une API `/api/v1/consents` et un composant d'affichage du statut. Il
  y a donc déjà, dans le code, une **source de vérité du périmètre des personnes
  consentantes**.
- **Les partitions du mart sont immuables** (ADR 0029) : un rejeu écrit une
  nouvelle partition, jamais en place. Une partition figée qui contiendrait une
  personne ayant ensuite **révoqué** son consentement entre frontalement en
  tension avec le droit à l'effacement.
- **Le responsable de traitement et la base légale ne relèvent pas du code.** Ce
  sont des arbitrages institutionnels (référent données / DPO), restés ouverts
  depuis l'ADR 0026.

Sans décision de gouvernance préalable, le risque est d'écrire et de mettre en
service un pipeline qui profile des personnes **au-delà de tout périmètre de
consentement**, sur une base légale non établie, avec un responsable de
traitement non identifié.

## Décision

> **Le périmètre profilé est borné par le consentement existant, comme
> pré-requis bloquant — pas comme chantier différé.** Aucune donnée réelle n'est
> ingérée, dérivée ni servie pour une personne hors du périmètre de consentement
> attesté par `find-an-expert`.

Cet ADR **rouvre** l'[ADR 0026](0026-rgpd-perimetre.md) pour le cas précis du
profilage de collaborations, comme cette dernière le prévoit explicitement. Il
ne la contredit pas : l'institutionnel (base légale, responsable de traitement)
**reste hors dépôt** ; cet ADR ne tranche que les **bornes techniques côté
code**.

### Ce que le code prend en charge (dans le périmètre du dépôt)

- **Le consentement est la source de vérité du périmètre.** Le journal
  d'événements de consentement de `find-an-expert` (octroi/révocation horodatés)
  **détermine l'ensemble des personnes** pour lesquelles une donnée peut être
  ingérée, dérivée dans le mart et servie. Une personne sans consentement actif
  n'entre pas dans le pipeline ; une révocation la retire du périmètre servi.
- **Le mart est ré-dérivable by-design.** Malgré l'immuabilité des partitions
  (ADR 0029), le mart doit pouvoir être **régénéré ou masqué** pour honorer une
  révocation et le droit à l'effacement. Concrètement : la donnée nominative
  d'une personne révoquée est exclue de la **partition courante servie** (par
  régénération à partir du périmètre de consentement à jour, ou masquage à la
  lecture), et aucune partition figée n'est traitée comme source faisant autorité
  pour le service. L'immuabilité reste un invariant de **traçabilité du
  pipeline**, pas un droit de conserver indéfiniment une donnée personnelle.
- **Pas d'endpoint anonyme listant des chercheurs.** `atlas-api` exige une
  **authentification** sur toute route exposant des personnes ou des
  recommandations nominatives. Le mart nominatif n'est pas accessible sans
  identification de l'appelant.

### Ce qui reste institutionnel (hors dépôt, à trancher par le référent/DPO)

- La **base légale** du profilage (consentement, intérêt légitime, mission
  d'intérêt public…) — à faire valider, le consentement existant en étant la
  borne technique mais pas nécessairement la justification juridique complète.
- Le **responsable de traitement** (question Q6 ouverte de l'ADR 0026), toujours
  non identifié.
- L'**information des personnes** et l'exercice du **droit d'opposition** au
  profilage automatisé (volet EU AI Act), dans leur forme et leur portée
  juridiques.

Le code fournit les **bornes et les leviers** (périmètre = consentement,
ré-dérivabilité, auth obligatoire) ; il ne se substitue pas à l'arbitrage
juridique.

## Statut

Accepted (2026-06-02).

La décision d'architecture et de gouvernance technique est actée. **La mise en
service avec des données réelles reste conditionnée à l'arbitrage du référent
données / DPO** sur la base légale et le responsable de traitement : tant que cet
arbitrage n'a pas eu lieu, le pipeline ne traite pas de données personnelles
réelles (jeux de test/synthétiques uniquement).

## Conséquences

**Bénéfices.** Le profilage a un périmètre **défini et mécaniquement
vérifiable** (le consentement attesté), au lieu d'un périmètre implicite « tout
OpenAlex ». La gouvernance des données personnelles est tranchée **avant** le
premier code manipulant du réel, ce qui évite d'avoir à reconstruire le pipeline
après coup. La tension entre partitions immuables et droit à l'effacement est
résolue explicitement, par conception, plutôt que découverte en production. La
réutilisation du dispositif de consentement existant évite de dupliquer un
sous-système sensible.

**Prix à payer.** Le pipeline est **contraint en amont** : il doit consulter le
périmètre de consentement et le maintenir à jour, ce qui ajoute un couplage
fonctionnel à `find-an-expert` et un coût de ré-dérivation à chaque révocation.
Le périmètre profilé peut être **étroit** au démarrage (seules les personnes
consentantes), limitant la richesse du graphe de collaborations. La mise en
service réelle reste **bloquée** sur un arbitrage hors de notre main (DPO) : cet
ADR ne lève pas, à lui seul, l'autorisation de traiter du réel.

**Garde-fous.**

- **Ce gate bloque la phase 0 du plan** (ADR 0029) : aucune phase manipulant des
  données réelles ne démarre tant que le périmètre de consentement n'est pas
  branché comme source de vérité et que l'arbitrage DPO n'a pas eu lieu.
- **Toute extension du périmètre profilé rouvre cet ADR** : ajouter un type de
  donnée personnelle, une source hors OpenAlex, ou servir des personnes au-delà
  du consentement attesté est une nouvelle décision — dans la continuité du
  garde-fou de l'[ADR 0026](0026-rgpd-perimetre.md).
- Le **journal de consentement** de `find-an-expert` est la référence opposable
  du périmètre : une divergence entre le périmètre servi par `atlas-api` et ce
  journal est un défaut bloquant, pas une dérive tolérée.
- L'item de suivi institutionnel correspondant reste rattaché au tableau sine die
  de l'[ADR 0001](0001-devsecops-perimetre-repo-sine-die.md) (responsable de
  traitement, base légale), dont cet ADR borne désormais le volet technique.

# 0030 — Profilage de collaborations : gate RGPD, base légale et droit d'opposition

## Contexte

L'[ADR 0029](0029-architecture-pipeline-collaborations.md) pose l'architecture
d'un pipeline mensuel qui dérive, depuis les données bibliographiques publiques
d'OpenAlex, un **mart de paires de chercheurs** (table de fait associant deux
personnes nommées, assortie de features de proximité et d'un score de
collaboration) servi par `atlas-api` à une PWA sous forme de **recommandations
nominatives** (« tel chercheur est un partenaire pertinent ») accompagnées d'un
résumé explicatif.

L'outil est **générique et multi-tenant** : il n'est pas spécifique à un
établissement. Chaque instance est exploitée par un établissement (l'ULHN est le
**premier déploiement**, pas un cas particulier), qui en est le **responsable de
traitement**. Un utilisateur (chercheur authentifié) **déclare dans
l'application les établissements de ses alliances et projets de recherche** ;
cette déclaration **filtre l'affichage** des recommandations qui le concernent.

**Données publiques ≠ hors RGPD.** Le règlement (art. 4.1) qualifie de donnée
personnelle _toute information se rapportant à une personne physique identifiée
ou identifiable_, **sans exception pour les données publiques**. Le nom d'un
chercheur, son ORCID, ses publications et ses affiliations sont à la fois
publics et personnels : leur publication par OpenAlex rend la **collecte**
licite à la source, mais ne fait pas sortir du champ du règlement ce qu'on en
**dérive** ensuite.

Or ce pipeline ne se contente pas de réafficher des données publiques. Il :

1. **crée une donnée nouvelle inférée** — le lien profilé et scoré entre deux
   personnes, qui n'existe nulle part dans OpenAlex ;
2. **profile** des personnes au sens de l'art. 4.4 (évaluation automatisée
   d'aspects personnels — ici un potentiel de collaboration / d'« excellence ») ;
3. **restitue des recommandations nominatives** individuelles (et non des
   agrégats anonymes).

C'est donc un **traitement de données à caractère personnel** relevant du RGPD,
dont le volet profilage relève de l'attention de l'**EU AI Act** — même si les
données sont publiques et non sensibles.

À l'inverse, le traitement reste **proportionné et minimisant** : le modèle
**réduit** l'information traitée — un article devient une liste
`domain / field / subfield / topic / keyword`, un chercheur devient un historique
d'articles ; aucune donnée sensible n'est manipulée (art. 5.1.c, minimisation).

L'[ADR 0026](0026-rgpd-perimetre.md) a acté que le périmètre RGPD vit **hors du
dépôt** (politique institutionnelle, pas du code), avec des **questions
ouvertes** (responsable de traitement Q6, données des apps Q2), et un garde-fou :
« la collecte d'un nouveau type de donnée personnelle par une app déployée
rouvre cette décision ». **Le pipeline de l'ADR 0029 est ce déclencheur.**

Deux faits techniques cadrent la suite :

- **Les partitions du mart sont immuables** (ADR 0029) : un rejeu écrit une
  nouvelle partition. Une partition figée contenant une personne s'étant
  **opposée** entre en tension avec le droit d'opposition et le droit à
  l'effacement.
- **La PWA dispose déjà d'un dispositif** d'événements horodatés
  (octroi/révocation), réutilisable comme **registre d'opposition**.

## Décision

> **Le traitement repose sur une base légale d'intérêt public / intérêt
> légitime — pas sur le consentement — en _opt-out_ : tout chercheur du
> périmètre est profilé par défaut, sauf opposition. La déclaration des alliances
> par l'utilisateur filtre l'_affichage_, pas l'_ingestion_. Le droit
> d'opposition (art. 21) retire effectivement une personne du mart et de
> l'index.**

Cet ADR **rouvre** l'[ADR 0026](0026-rgpd-perimetre.md) pour le cas du profilage
de collaborations. Il ne la contredit pas : l'institutionnel (validation des
bases légales, responsable de traitement) **reste hors dépôt** ; cet ADR tranche
les **bornes techniques côté code**.

### Base légale (à confirmer par le DPO de l'établissement exploitant)

Le **consentement n'est pas la base retenue** : révocable et instable, il est
inadapté à une finalité de service public et au filtrage d'affichage. On retient,
**à faire valider** :

- **Mission d'intérêt public (art. 6.1.e)** : favoriser, au sein des alliances et
  projets de recherche d'un établissement, l'identification de collaborations
  d'excellence relève de la mission de service public de recherche. La PWA
  cantonne d'ailleurs l'affichage au périmètre des alliances déclaré par
  l'utilisateur, ce qui ancre la finalité dans un cadre de collaboration
  légitime.
- **Intérêt légitime (art. 6.1.f)** comme base alternative/complémentaire, avec
  **test de mise en balance** documenté par le DPO, notamment pour les chercheurs
  d'établissements partenaires.

Comme l'outil est multi-tenant, la base légale est tranchée **par le responsable
de traitement de chaque instance** (son DPO). Le code ne tranche pas le
juridique ; il **fournit les leviers** (opposition, ré-dérivabilité, auth,
périmètre paramétrable).

### Ce que le code prend en charge (dans le périmètre du dépôt)

- **Opt-out, pas opt-in.** Le périmètre profilé par défaut est l'ensemble des
  chercheurs du périmètre d'ingestion de l'instance. Le dispositif d'événements
  de la PWA sert de **registre d'opposition** : il **retire** du traitement les
  personnes opposées (il n'« inclut » pas seulement des consentants).
- **Déclaration utilisateur = filtre d'affichage.** L'utilisateur déclare ses
  alliances/projets ; cela borne **ce qu'on lui montre**, pas ce que le pipeline
  ingère ou profile. _Conséquence assumée :_ on profile **plus de personnes
  qu'on n'en affiche** à un utilisateur donné (calcul global, vue filtrée) — un
  point de proportionnalité que le DPO examinera (cf. _Prix à payer_).
- **Mart et index ré-dérivables by-design.** Malgré l'immuabilité des partitions
  (ADR 0029), le mart **et** l'index pgvector doivent pouvoir être **régénérés ou
  masqués** pour honorer une opposition et le droit à l'effacement : la donnée
  d'une personne opposée est exclue de la **partition courante servie**
  (régénération depuis `curated` filtré sur le registre d'opposition à jour, ou
  masquage à la lecture, et purge des lignes de l'index). L'immuabilité reste un
  invariant de **traçabilité**, pas un droit de conservation indéfinie. Le
  mécanisme complet (registre d'opposition, régénération, masquage, purge de
  l'index, SLA) est spécifié dans
  [Ré-dérivabilité du mart et de l'index](../architecture/re-derivabilite-mart-index.md).
- **Pas d'endpoint anonyme listant des chercheurs.** `atlas-api` exige une
  **authentification** sur toute route exposant des personnes ou des
  recommandations nominatives.

### Ce qui reste institutionnel (hors dépôt, à trancher par le DPO)

- La **validation des bases légales** (intérêt public / intérêt légitime + test
  de mise en balance) par le responsable de traitement de l'instance.
- Le **responsable de traitement** (question Q6 de l'ADR 0026) : l'établissement
  exploitant — à nommer explicitement par instance.
- L'**information des personnes** profilées et les modalités d'exercice du **droit
  d'opposition** et du **droit à l'effacement**.
- L'éventuelle **analyse d'impact (AIPD/DPIA)**, le profilage à cette échelle
  pouvant la justifier.

## Statut

Accepted (2026-06-02).

La gouvernance technique est actée. **La mise en service d'une instance avec des
données réelles reste conditionnée à l'arbitrage du DPO de l'établissement
exploitant** sur les bases légales et le responsable de traitement : tant que cet
arbitrage n'a pas eu lieu, le pipeline ne traite pas de données personnelles
réelles (jeux de test/synthétiques uniquement).

### Demande d'arbitrage tracée (2026-06-02)

Conformément à l'étape 0.3 du plan
[pipeline-collaborations](../plans/2026-06-02-pipeline-collaborations.md), la
demande d'arbitrage institutionnel est **tracée ici** (gate phase 0). Points à
trancher par le référent données / DPO de l'établissement exploitant, dans la
continuité des questions ouvertes Q2/Q6 de l'[ADR 0026](0026-rgpd-perimetre.md) :

1. **Base légale** à valider : mission d'intérêt public (art. 6.1.e) pour les
   chercheurs de l'établissement ; intérêt légitime (art. 6.1.f, avec test de
   mise en balance) pour les chercheurs d'établissements partenaires.
2. **Responsable de traitement** à identifier explicitement (l'établissement
   exploitant l'instance).
3. **Information des personnes** profilées et modalités d'exercice du **droit
   d'opposition** (art. 21) et du **droit à l'effacement**.
4. **Valeur du SLA** de propagation d'une opposition (cf.
   [Ré-dérivabilité du mart et de l'index](../architecture/re-derivabilite-mart-index.md), §5).
5. Nécessité éventuelle d'une **analyse d'impact (AIPD/DPIA)**.

**Effet du gate :** ouvert pour le développement sur **données synthétiques /
fixtures** ; **fermé** pour tout déploiement en **production avec données
nominatives réelles** tant que cet arbitrage n'est pas revenu.

## Conséquences

**Bénéfices.** La base légale (intérêt public / intérêt légitime) est **adaptée à
une finalité de service public** et **stable** — contrairement au consentement,
révocable. La finalité est **ancrée** dans un cadre de collaboration légitime
(alliances/projets déclarés), ce qui soutient la proportionnalité. L'outil étant
**générique**, le même code sert plusieurs établissements, chacun responsable de
sa propre instance — cohérent avec un produit réutilisable. La tension immuabilité
/ droits des personnes est résolue par conception (ré-dérivabilité). Le dispositif
existant de la PWA est réutilisé comme registre d'opposition, sans nouveau
sous-système.

**Prix à payer.** L'_opt-out_ **traite par défaut des personnes qui n'ont rien
demandé** : cela **renforce** l'obligation d'**information** et la nécessité d'un
**droit d'opposition réellement effectif**. Le choix « filtre d'affichage » (et
non d'ingestion) implique de **profiler plus de personnes qu'on n'en montre** à
un utilisateur — un arbitrage de proportionnalité que le DPO devra valider ;
l'alternative (limiter l'ingestion aux établissements effectivement déclarés)
minimiserait davantage mais complexifierait l'ingestion. Le multi-tenant déplace
la responsabilité juridique sur **chaque** établissement exploitant. Le coût de
ré-dérivation est payé à chaque opposition.

**Garde-fous.**

- **Ce gate bloque la phase 0 du plan** (ADR 0029) : aucune phase manipulant des
  données réelles ne démarre tant que le registre d'opposition n'est pas branché
  et que l'arbitrage DPO (bases légales, information, responsable de traitement)
  n'a pas eu lieu pour l'instance considérée.
- **Droit d'opposition opérationnel, pas théorique** : une divergence entre le
  périmètre servi par `atlas-api` et le registre d'opposition est un défaut
  **bloquant**. Une opposition retire la personne du mart **et** de l'index dans
  le SLA défini.
- **Toute extension du périmètre ou de la finalité rouvre cet ADR** : nouvelle
  source de données personnelles, finalité au-delà de la suggestion de
  collaboration, ou passage du filtre d'affichage à un profilage encore plus
  large — autant de nouvelles décisions (continuité du garde-fou de
  l'[ADR 0026](0026-rgpd-perimetre.md)).
- **Minimisation maintenue** : le modèle ne traite que la réduction
  `domain/field/subfield/topic/keyword` + historique d'articles ; aucune donnée
  sensible, aucun élargissement silencieux du périmètre de données.
- L'item de suivi institutionnel reste rattaché au tableau sine die de
  l'[ADR 0001](0001-devsecops-perimetre-repo-sine-die.md) (bases légales,
  responsable de traitement), dont cet ADR borne le volet technique.

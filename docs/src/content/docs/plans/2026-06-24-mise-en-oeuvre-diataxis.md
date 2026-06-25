---
title: Plan — Mise en œuvre de la typologie Diátaxis
---

> Date du plan : 2026-06-24. Socle décisionnel : [ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/)
> (adoption de Diátaxis comme **troisième axe** — l'_intention_ — de structuration de
> la documentation rédigée, orthogonal à l'axe _audience_
> ([ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/)) et à l'axe _thème_
> (R6, [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/))).
> L'ADR 0074 **adopte** la typologie ; il **disjoint** explicitement l'adoption de sa
> **mise en œuvre** (rangement des pages, refonte de la barre latérale, ajustement des
> renvois) et la renvoie à ce plan dédié. Ce plan porte le **comment** ; l'ADR 0074
> porte le **pourquoi**. Il s'inscrit dans la visée non-experte de
> [ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) et reste régi
> en exactitude par [ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
> (`pnpm audit:docs`).

## Objectif

Exécuter la **mise en œuvre** de la typologie Diátaxis sur la documentation publiée
d'Atlas : confirmer le **mode dominant** de chaque page de prose (tutorial, how-to,
reference, explanation — Diátaxis, _du grec dia-_ « à travers » _et taxis_
« ordonnancement »), réorganiser la **barre latérale** par intention, **renommer ou
scinder** les rares pages mal classées et **ajuster les renvois** internes en
conséquence. Le but n'est pas d'inventer un classement — l'ADR 0074 l'a déjà
esquissé — mais de le **consolider, arbitrer et câbler** dans le dépôt.

## Ce que ce plan n'est pas

- **Une re-décision de la typologie** : l'axe d'intention est **acté** par l'ADR 0074 ;
  ce plan ne le rouvre pas. Si un arbitrage de mise en œuvre fait apparaître un besoin
  de décision structurante (p. ex. scinder le plan-décision en un ADR + un plan), il
  ouvre un **ADR** ou une **issue**, pas un débat dans ce fichier.
- **Un garde-fou exécutable sur le mode** : l'ADR 0074 **désavoue** tout contrôle
  automatique du mode (le mode est une intention, non un fait mesurable — réserve
  reprise du dépôt `cluster`). Ce plan **n'ajoute aucun** check `audit:docs` sur le
  classement. Le mode reste un **critère de revue de rédaction**, pas un test.
- **Le comblement du trou _tutorial_** : l'ADR 0074 relève qu'**aucun tutorial pur**
  n'existe (pas de parcours _learn-by-doing_). Écrire ce tutorial est un **chantier de
  contenu distinct** (hors périmètre) ; ce plan se contente de **réserver la place**
  (groupe « Apprendre » vide) sans rédiger la page.
- **Une refonte du moteur de doc** ni de l'arborescence de fichiers sur disque (voir
  P1, option B) : la réorganisation porte d'abord sur la **barre latérale** et les
  **renvois**, pas sur un déplacement massif de fichiers (qui casserait les URLs).

## Principes directeurs

- **Liens d'abord** : aucune réorganisation n'est mergée tant que `pnpm docs:build`
  (qui échoue sur lien interne cassé) et `pnpm audit:docs` ne sont pas verts. Tout
  renommage/déplacement de page qui change une URL est accompagné de la mise à jour de
  **tous** ses référents (renvois internes, ADR, README racine).
- **Réversibilité** : la barre latérale (P1) est un **réordonnancement d'affichage**,
  pas un déménagement de fichiers — réversible d'un `git revert`. Les opérations
  risquées pour les URLs (P2) sont isolées et minimales.
- **Une page = un mode dominant** : on vise l'**intention dominante**, pas la pureté
  absolue (ADR 0074). Une page d'architecture qui cite des faits reste _explanation_ ;
  on ne scinde que les pages réellement **bicéphales**.
- **Agentique-ready** : chaque phase est exécutable par un agent Claude sans question.
  En cas d'ambiguïté de classement irréductible : stop avec rapport de blocage (issue
  `blocker:`), sans deviner — le classement reste un jugement humain.
- **Non-régression** : `pnpm docs:build` et `pnpm audit:docs` verts à chaque étape ;
  compteurs d'ADR (R8, [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/))
  et liens préservés.
- **Commits** : Conventional Commits, sujet minuscule, scope `docs` (documentation /
  ADR), pas de `Co-Authored-By`. Une PR par phase. Hooks lefthook **jamais** bypassés.

## Vue d'ensemble des phases

| Phase  | Titre                                       | Nature             | Touche les URLs ?        | Risque |
| ------ | ------------------------------------------- | ------------------ | ------------------------ | ------ |
| **P0** | Valider et figer le classement page→mode    | revue + ce plan    | non                      | nul    |
| **P1** | Réorganiser la barre latérale par intention | `astro.config.mjs` | non (réordonnancement)   | faible |
| **P2** | Renommer / scinder les pages mal classées   | fichiers + renvois | **oui** (URLs modifiées) | élevé  |
| **P3** | Ajuster les renvois inter-modes             | prose (liens)      | non                      | faible |

**Graphe de dépendances** : `P0 → P1 → P2 → P3`. P0 est le **prérequis** de tout
(on ne réorganise pas un classement non figé). P1 (affichage) précède P2 (fichiers)
pour exposer les regroupements et révéler tôt les pages-frontière. P3 referme la
boucle une fois les pages à leur place. P1 et P3 sont **réversibles** ; P2 est la
seule phase qui modifie des URLs et concentre le risque.

---

## P0 — Valider et figer le classement page→mode

**Objectif.** Transformer la **cartographie indicative** de l'ADR 0074 (« non
contraignante », chaque ligne « à revérifier et arbitrer ») en un **classement de
référence** opposable, en confirmant le mode dominant page par page et en tranchant
les pages-frontière. **On consolide ; on ne ré-invente pas.**

**Dépendances.** Aucune. **Touche les URLs ?** Non.

**Critère de sortie.** Le tableau ci-dessous est revérifié contre l'arborescence
réelle (`docs/src/content/docs/`) ; toute page nouvelle depuis l'ADR 0074 y est
ajoutée ; chaque ligne « Scinder » ou « Renommer » a une issue liée. `pnpm docs:build`
et `pnpm audit:docs` verts (ce plan ne casse aucun lien).

### Classement de référence (consolidé depuis l'ADR 0074)

Reprise **fidèle** de la cartographie de l'ADR 0074, regroupée **par mode** (et non
plus par dossier) pour préparer P1. Seules les colonnes « Action » signalent un
mouvement ; tout le reste est « Garder ».

#### explanation — _comprendre le pourquoi_

| Page                                         | Justification courte                                                      | Action |
| -------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| `index.mdx` (accueil)                        | Présente le _pourquoi_ de la chaîne de qualité, renvoie aux attestations. | Garder |
| `architecture/monorepo.mdx`                  | Explique _ce qu'est_ un monorepo et _pourquoi_ cette structure.           | Garder |
| `architecture/comprendre-le-code.md`         | Guide de lecture (« par où entrer »), discursif.                          | Garder |
| `architecture/data-flow.md`                  | Décrit à haut niveau _comment_ les données circulent, pour comprendre.    | Garder |
| `architecture/tech-choices.md`               | Récapitule les choix et le _pourquoi_ / l'alternative écartée.            | Garder |
| `architecture/modele-uplift-fwci.md`         | Éclaire qualités, précautions et tests du modèle pour un non-développeur. | Garder |
| `architecture/re-derivabilite-mart-index.md` | Explique le mécanisme de propagation d'une opposition RGPD.               | Garder |
| `quality/code-style.md`                      | Justifie _pourquoi_ chaque règle de style et _ce qu'elle coûte_.          | Garder |
| `quality/tests.md`                           | Part du _pourquoi des tests_, discursif sur la pyramide.                  | Garder |
| `quality/documentation.mdx`                  | Expose la _politique_ de doc (langue, niveaux, ton) et son pourquoi.      | Garder |
| `audit/2026-05-29.md`                        | Rapport d'audit discursif (constats, notes, recommandations).             | Garder |
| `audit/2026-06-04-cloud-native.md`           | Rapport d'audit cloud-native, discursif.                                  | Garder |
| `audit/2026-06-04-effect-socle.md`           | Rapport d'audit du socle Effect, discursif.                               | Garder |
| `audit/2026-06-15-maturite-referentiels.md`  | Rapport de maturité (4 référentiels), discursif.                          | Garder |
| `audit/2026-06-24-uplift-fwci-eunicoast.md`  | Reconnaissance (spike) consignée, discursive.                             | Garder |
| `decisions/parcours.md`                      | Parcours de lecture guidé à travers les ADR — discursif.                  | Garder |
| `decisions/00xx-*.md` (tous les ADR)         | Un ADR explique un choix, son contexte et ses conséquences.               | Garder |

#### reference — _consulter un fait_

| Page                                        | Justification courte                                                 | Action |
| ------------------------------------------- | -------------------------------------------------------------------- | ------ |
| `glossary.md`                               | Table de termes consultable, on y cherche une définition.            | Garder |
| `architecture/packages.md`                  | Liste exhaustive des paquets (rôle, deps), consultable.              | Garder |
| `quality/normes.md`                         | Bilan consultable des pratiques en place, discipline par discipline. | Garder |
| `quality/security.md`                       | Inventaire des secrets, surfaces, SAST/DAST, SBOM — consultable.     | Garder |
| `quality/ci-pipeline.md`                    | Décrit les étapes du pipeline CI, page consultée pour un fait.       | Garder |
| `quality/hooks.md`                          | Décrit chaque hook Git et ce qu'il vérifie, consultable.             | Garder |
| `quality/accessibilite.md`                  | Recense les pratiques a11y appliquées et leurs contrôles.            | Garder |
| `quality/tableau-de-bord.mdx`               | Indicateurs de robustesse paquet par paquet, consultable.            | Garder |
| `collaboration/releases.md`                 | Décrit le mécanisme Changesets et les registres de publication.      | Garder |
| `audit/index.md`                            | Index daté des rapports d'audit (état figé à l'instant T).           | Garder |
| `audit/registre-drifts.mdx`                 | Catalogue consultable des drifts révélés à l'exécution.              | Garder |
| `plans/index.md`                            | Index des plans de résorption, consultable.                          | Garder |
| `plans/2026-05-30-resorption-validation.md` | Rapport de validation d'un plan (constat figé).                      | Garder |

#### how-to — _accomplir une tâche précise_

| Page                                              | Justification courte                                          | Action |
| ------------------------------------------------- | ------------------------------------------------------------- | ------ |
| `quality/incident-response.md`                    | Procédure à appliquer en cas d'incident — orientée tâche.     | Garder |
| `collaboration/workflow.md`                       | Décrit le flux standard de contribution branche → PR → merge. | Garder |
| `collaboration/environnement-local.md`            | _Ce qu'il faut installer_ pour développer — orienté action.   | Garder |
| `collaboration/installer-les-clis.md`             | Installer les CLIs depuis les registres — recette de tâche.   | Garder |
| `collaboration/parametrage-github.md`             | Configurer le dépôt GitHub (protections, secrets) — tâche.    | Garder |
| `collaboration/checklist-deploiement.md`          | Liste de vérifications avant mise en service d'une instance.  | Garder |
| `plans/2026-05-30-resorption.md`                  | Plan d'action phasé, exécutable étape par étape.              | Garder |
| `plans/2026-06-02-pipeline-collaborations.md`     | Plan d'implémentation phasé du pipeline.                      | Garder |
| `plans/2026-06-04-resorption-cloud-native.md`     | Plan de résorption phasé.                                     | Garder |
| `plans/2026-06-04-socle-effect.md`                | Plan de résorption du socle Effect, phasé.                    | Garder |
| `plans/2026-06-11-producteur-researchers.md`      | Plan d'implémentation du mart `researchers`.                  | Garder |
| `plans/2026-06-23-mise-en-production-openalex.md` | Plan de mise en production phasé.                             | Garder |
| `plans/2026-06-24-uplift-fwci-eunicoast.md`       | Plan d'implémentation du modèle d'uplift, phasé.              | Garder |
| `plans/2026-06-24-mise-en-oeuvre-diataxis.md`     | **Ce plan** — feuille de route exécutable, phasée.            | Garder |
| `plans/documentation-verifiable.md`               | Plan d'action documentation vérifiable.                       | Garder |

#### tutorial — _apprendre en faisant_

| Page       | Justification courte                                                         | Action                                   |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| _(aucune)_ | **Trou identifié** par l'ADR 0074 : aucun parcours _learn-by-doing_ de zéro. | Hors périmètre (réserver la place en P1) |

#### Page-frontière à arbitrer

| Page                                                 | Mode proposé (ADR 0074)  | Action proposée (ADR 0074)                                                                          |
| ---------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `plans/2026-06-11-topologie-depots-cluster-atlas.md` | explanation **+** how-to | **Scinder** : la part _décision_ relève d'une explanation / d'un ADR ; la part _plan_ reste how-to. |

L'ADR 0074 désigne cette page comme **la seule** réellement bicéphale. P0 tranche :
soit on **scinde** (P2), soit on acte qu'elle reste un plan-décision toléré (avec un
renvoi clair). **Décision par défaut** : scinder en P2 (extraire la décision vers un
ADR, garder le plan d'exécution), pour respecter « une page = un mode dominant ».

> **Fait (2026-06-25).** P2 réalisée : la décision est extraite vers
> l'[ADR 0077](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/) ; la feuille de route
> est conservée dans le plan (slug **inchangé** → aucune URL cassée).

> _Note de péremption._ Ce classement est daté du **2026-06-24** et reflète l'état du
> dépôt à cette date. Toute page ajoutée ensuite doit être classée à sa création (en
> revue de rédaction), **pas** rétro-ajoutée ici : ce tableau est un instantané de
> départ, non un registre vivant exhaustif (cf. risque _péremption_ ci-dessous).

---

## P1 — Réorganiser la barre latérale par intention

> **Revenu sur (2026-06-25).** La barre latérale par intention décrite ci-dessous a été livrée
> (#468) puis **remplacée par une barre latérale thématique** : à l'usage, le regroupement par
> intention **éclatait les sujets**. Voir l'[ADR 0078](/atlas/decisions/0078-sidebar-thematique-navigation-diataxis-intra-categorie/),
> qui amende le volet sidebar de l'ADR 0076 et retire ses deux portails. Diátaxis reste un principe
> de **rédaction** (ADR 0074, intact). Le descriptif d'origine est conservé ci-dessous pour mémoire.

**Objectif.** Faire passer la barre latérale (`docs/astro.config.mjs`) d'un regroupement
**par dossier thématique** (_Architecture_, _Qualité & sécurité_, _Collaboration_,
_Décisions_, _Audits_, _Plans_) à un regroupement **par mode** (intention), selon
l'esquisse de l'ADR 0074. C'est un **réordonnancement d'affichage** : aucun fichier ne
bouge, aucune URL ne change.

**Dépendances.** P0 (classement figé). **Touche les URLs ?** Non.

**Barre latérale cible** (4 groupes par intention, reprise de l'ADR 0074) :

- **Apprendre** (_tutorial_) — **vide aujourd'hui** ; réserve la place du futur
  parcours de prise en main pas-à-pas (trou identifié en P0). Un groupe vide n'est pas
  affiché par Starlight ; on documente l'intention sans rien câbler de prématuré.
- **Faire** (_how-to_) — `collaboration/*`, `quality/incident-response`, les `plans/*`.
- **Consulter** (_reference_) — `glossary`, `architecture/packages`,
  `quality/{normes,security,ci-pipeline,hooks,accessibilite,tableau-de-bord}`,
  `collaboration/releases`, les index `audit/`, `plans/` et `registre-drifts`.
- **Comprendre** (_explanation_) — le reste d'`architecture/*`,
  `quality/{code-style,tests,documentation}`, les rapports d'`audit/*`, les
  `decisions/*` (ADR + `parcours`).

**Point dur technique.** La config actuelle utilise `autogenerate: { directory: … }`,
qui groupe **par dossier**. Un regroupement par mode exige soit des **groupes à `items`
explicites** (lien par lien, au prix d'une liste à maintenir à la main), soit de
conserver l'autogénération **par dossier en sous-groupes** sous chaque mode. **Arbitrage
P1** : privilégier `items` explicites par mode pour les pages stables (architecture,
quality) et garder l'autogénération pour les collections volumineuses et datées
(`decisions/`, `audit/`, `plans/`) afin de ne pas devoir éditer la config à chaque
nouvel ADR/audit/plan.

**Critère de sortie.** `pnpm docs:build` vert ; la barre latérale rend 4 groupes
d'intention (le groupe _Apprendre_ reste non affiché tant qu'il est vide) ; aucune page
publiée n'est devenue inatteignable (toutes restent dans un groupe) ; capture avant/après
de la navigation jointe à la PR.

---

## P2 — Renommer / scinder les pages mal classées

> **Réalisée (2026-06-25).** Décision extraite vers l'[ADR 0077](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/),
> feuille de route conservée. **Le slug du plan a été gardé inchangé** — donc, contrairement à
> l'anticipation ci-dessous, P2 **n'a finalement modifié aucune URL** (aucun référent à mettre à
> jour). Le descriptif d'origine est conservé ci-dessous pour mémoire.

**Objectif.** Traiter les **rares** pages que P0 a marquées « Scinder » ou « Renommer ».
À l'état 2026-06-24, **une seule** page est concernée :
`plans/2026-06-11-topologie-depots-cluster-atlas.md` (bicéphale explanation + how-to).
C'est la **seule phase qui modifie des URLs** — donc la plus risquée.

**Dépendances.** P0 (arbitrage de la page-frontière), P1 (groupes exposés).
**Touche les URLs ?** **Oui** — opérations isolées et accompagnées de la mise à jour de
tous les référents.

**Opération (par défaut : scinder).**

1. Extraire la **part décision** (le _pourquoi_ de la topologie cluster/atlas) vers une
   **explanation** — un **ADR** (numéro = prochain libre, à vérifier, **ne pas
   présumer**) dans `decisions/`, référencé dans `decisions/index.md` et
   `decisions/parcours.md` (compteurs R8 à mettre à jour).
2. Garder la **part plan** (le _comment_ / la feuille de route) dans le fichier
   `plans/` existant, allégé de la prose décisionnelle, avec un **renvoi** vers le
   nouvel ADR.
3. Si l'URL du plan change (renommage), **recenser et mettre à jour tous les référents**
   avant merge : renvois internes, `plans/index.md`, tout ADR ou audit qui pointe vers
   l'ancienne URL, et — s'il existe un référent **racine** (README/CONTRIBUTING) — le
   pointer vers l'**URL publiée** `https://univ-lehavre.github.io/atlas/plans/<slug>/`.

**Garde-fou « même PR ».** Si la scission touche un point de contact avec le dépôt
`cluster`, mettre à jour [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
**dans la même PR**.

**Critère de sortie.** `pnpm docs:build` (lien cassé = échec) et `pnpm audit:docs`
(compteurs R8) verts ; `grep -rn` sur l'ancien slug ne renvoie **aucun** référent
résiduel ; le nouvel ADR est numéroté en continu et indexé.

---

## P3 — Ajuster les renvois inter-modes

**Objectif.** Appliquer la règle « **renvoyer, pas recopier** » de l'ADR 0074 : là où
une page d'un mode a besoin d'un autre mode, remplacer toute **recopie** de contenu par
un **lien Markdown** vers la page du bon mode (p. ex. un guide how-to qui recopie une
définition du `glossary` reference → la cite ; une explanation qui détaille un _comment_
→ renvoie vers le how-to). On supprime la **redite**, on ne crée pas de page.

**Dépendances.** P0–P2 (pages à leur place et nommées). **Touche les URLs ?** Non.

**Périmètre prudent.** On ne réécrit **pas** des sections entières : on retire les
recopies **flagrantes** repérées en P0 et on pose les renvois manquants. Une page reste
**dominante** dans son mode ; citer un fait ne la déclasse pas (ADR 0074, intention
dominante non exclusive).

**Critère de sortie.** `pnpm docs:build` + `pnpm audit:docs` verts ; les renvois ajoutés
pointent vers des slugs **existants** ; aucun fait n'a désormais **deux** sources de
vérité parmi les pages traitées.

---

## Risques

- **Liens cassés à la réorganisation (P2, P1).** Le risque majeur. Tout renommage de
  page change une URL et peut casser un renvoi interne, un lien d'ADR ou un lien
  **racine** (README/SECURITY, rendus sur GitHub). _Parade_ : `pnpm docs:build` échoue
  sur lien interne cassé ; recensement exhaustif des référents par `grep -rn <slug>`
  avant merge ; liens racine pointés vers les **URLs publiées**
  (`https://univ-lehavre.github.io/atlas/<section>/<slug>/`), plus robustes que les
  chemins relatifs ; P1 (affichage) ne touche aucune URL et reste réversible.
- **Péremption de la cartographie.** Le classement de P0 est un **instantané daté** ;
  toute page créée après le 2026-06-24 n'y figure pas et risque de naître mal classée si
  le tableau est pris pour un registre vivant. _Parade_ : la note de péremption en P0
  rappelle que le classement se fait **à la création** en revue de rédaction (pas de
  rétro-ajout), et que ce tableau n'est qu'un **point de départ**, pas une source de
  vérité maintenue. Aucun garde-fou exécutable ne le vérifie (choix assumé de l'ADR 0074).
- **Sur-application de Diátaxis (cargo-cult).** Le risque de scinder trop, d'afficher des
  badges de mode, ou de viser une pureté irréaliste. _Parade_ : l'ADR 0074 vise
  l'**intention dominante** (pas exclusive) et **écarte** explicitement les badges ; P2
  ne traite que la **seule** page réellement bicéphale ; P3 retire les recopies
  flagrantes, sans réécriture de fond.
- **Maintenance de la barre latérale à `items` explicites (P1).** Lister les pages à la
  main alourdit la config et risque l'oubli au prochain ajout. _Parade_ : garder
  l'**autogénération par dossier** pour les collections datées et volumineuses
  (`decisions/`, `audit/`, `plans/`), ne passer en `items` explicites que les groupes
  stables (architecture, quality).
- **Régression des compteurs d'ADR (R8).** La scission P2 crée un ADR et modifie les
  compteurs « N ADR » des pages catalogue. _Parade_ : `pnpm audit:docs` vérifie les
  compteurs (R8, [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)) ;
  mettre à jour `decisions/index.md` et `decisions/parcours.md` dans la même PR.

## Vérification

- **Par phase** : `pnpm docs:build` (lien interne cassé = échec) et `pnpm audit:docs`
  (compteurs R8, charte 0052) verts ; capture avant/après de la barre latérale (P1) ;
  `grep -rn` sans référent résiduel sur tout slug modifié (P2).
- **Transverse** : aucune page publiée rendue inatteignable ; aucun lien racine
  (README/CONTRIBUTING/SECURITY) brisé — vérifié contre les **URLs publiées**.
- **Pas de garde-fou exécutable sur le mode** : conforme à l'ADR 0074, on **n'ajoute
  aucun** check `audit:docs` sur le classement ; le mode reste un critère de revue.
- **Commit/PR** : merge commit, hooks non bypassés, sujet minuscule, pas de
  `Co-Authored-By`, scope `docs`.

---

## Phases additionnelles (ADR 0076 — portails d'orientation et accueil)

> Ajout du **2026-06-25**. Socle décisionnel complémentaire :
> [ADR 0076](/atlas/decisions/0076-portails-orientation-accueil-par-intention/), qui
> **complète** l'ADR 0074. L'axe par intention **éclate** les familles « bonnes
> pratiques » et « gouvernance » et laisse l'accueil sans lien vers la page-pivot
> [`quality/normes`](/atlas/quality/normes/). L'ADR 0076 acte deux **portails
> d'orientation** (reference, qui lient sans recopier — patron
> [ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)) et un
> **accueil par intention**. Ces phases portent leur mise en œuvre ; elles
> **n'ajoutent aucun** déplacement de fichier ni changement d'URL (purement additives).

### Recalage P0 (péremption confirmée au 2026-06-25)

Le classement P0 est daté du 2026-06-24 ; quatre pages présentes sur disque y manquent
et sont classées ici :

| Page                                         | Mode        | Groupe sidebar |
| -------------------------------------------- | ----------- | -------------- |
| `quality/preuves.md`                         | reference   | Consulter      |
| `quality/matrice-e2e.md`                     | reference   | Consulter      |
| `audit/2026-06-24-best-of-cluster-atlas.md`  | explanation | Comprendre     |
| `audit/2026-06-24-veracite-documentation.md` | explanation | Comprendre     |

Aucune n'impose de travail : `audit/*` reste autogénéré (Comprendre) ; les deux pages
`quality/*` sont à inclure dans la liste explicite « Consulter » de P1 — à ne pas
oublier (sinon le contrôle d'orphelines B9 les rattrape au build).

### Contrainte dure B9 (à respecter en P1)

Le contrôle **B9** de [`scripts/audit/documentation.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/documentation.mjs)
(`findOrphanPages`) parse `astro.config.mjs` : une page est joignable si son **dossier
de 1er niveau** a un `autogenerate.directory`, **ou** si la page a un **`link:` exact**
(slug sans `/atlas/` ni extension), **ou** si c'est `index`. Passer `architecture/`,
`quality/`, `collaboration/` en `link:` par intention **oblige à lister toutes leurs
pages** (sinon B9 bloque `pnpm audit:docs`). Les collections datées (`decisions/`,
`audit/`, `plans/`) restent en `autogenerate` (B9 satisfait par `directory:`).

### P1 (précisé) — barre latérale : items explicites + autogénération des collections

Le bloc `sidebar` de `astro.config.mjs` adopte : **`link:` explicites** pour les pages
stables réparties par intention (architecture / quality / collaboration — une page d'un
même dossier peut atterrir dans deux groupes) ; **`autogenerate`** pour `decisions/`
(Comprendre), `audit/` (Comprendre), `plans/` (Faire), placé dans le groupe du mode
**dominant du corpus** ; les **index** de ces collections (mode reference) **rappelés en
lien** dans « Consulter » (doublon assumé = raccourci, purgeable par
`sidebar: { hidden: true }` sur les trois `index.md`). Le groupe **« Apprendre »** reste
`items: []` (non rendu par Starlight). Mapping page→groupe : voir le recalage P0 ci-dessus
et le classement P0 d'origine.

### P4 — portail « Bonnes pratiques » (NOUVELLE PAGE)

Créer `docs/src/content/docs/quality/bonnes-pratiques.md` (mode **reference**, URL
`/atlas/quality/bonnes-pratiques/`, groupe « Consulter », en tête). La page **lie** par
thème les pages existantes et l'ADR qui les fonde — style (`code-style` + 0020), Effect
(`code-style` + 0005/0045), hooks (`hooks` + 0015), commits/branches (0014/0016/0053),
tests (`tests` + `matrice-e2e` + 0049), charte/doc (`documentation` + 0052/0028/0074),
sécurité (`security` + `ci-pipeline` + 0001/0018), a11y (`accessibilite` + 0038),
releases (`releases` + 0017/0022/0024) — et **renvoie** à
[`quality/normes`](/atlas/quality/normes/) en déclarant la distinction portail↔bilan
(anti-redite R6). **Zéro recopie** de chiffre/seuil. **Dépendance** : son `link:` doit
être ajouté à la sidebar dans la **même PR** (sinon B9 la voit orpheline).

### P5 — portail « Gouvernance » (NOUVELLE PAGE)

Créer `docs/src/content/docs/quality/gouvernance.md` (mode **reference**, URL
`/atlas/quality/gouvernance/`, groupe « Consulter »). **Liens uniquement** vers : index
des décisions (`/atlas/decisions/`) + parcours, index des audits (`/atlas/audit/`),
**registre des drifts** (`/atlas/audit/registre-drifts/`, entrée canonique des écarts —
0056/0071), matrice E2E (`/atlas/quality/matrice-e2e/`), index des plans
(`/atlas/plans/`), **issues** ouvertes (lien externe simple
`https://github.com/univ-lehavre/atlas/issues`, **pas d'agrégateur automatique**), et la
méta-gouvernance (0071). **N'est pas** une catégorie de 1er niveau — une page reference.
**Dépendance** : `link:` ajouté à la sidebar dans la **même PR** (B9).

### P6 — accueil par intention (`index.mdx`)

Refondre uniquement le `<CardGrid>` (hero + import inchangés) en 6 cards renvoyant aux
pivots, **Normes en tête** : (1) « Le bilan, vérifiable » → `/atlas/quality/normes/` ;
(2) « Les bonnes pratiques, en un point » → portail Bonnes pratiques ; (3) « Qualité et
sécurité outillées » → `code-style` · `ci-pipeline` · `security` (**fusion** de l'ancien
« typage strict », fondu) ; (4) « Des tests à plusieurs niveaux » → `tests` ·
`matrice-e2e` ; (5) « Une gouvernance lisible » → portail Gouvernance · `/atlas/decisions/` ;
(6) « Une carte du code toujours à jour » → `architecture/packages`. La home reste
**explanation** (renvoie, ne recopie pas). **Dépendance** : P4 et P5 (ses cards lient les
portails).

### Découpage en PR (additionnel)

`PR-A` ADR 0076 + index/parcours (cette PR). → `PR-B` cette extension de plan. →
**`PR-(P4+P5+P1)` fusionnée** : créer les deux portails **et** basculer la sidebar (les
portails doivent être liés dès leur création — B9). → `PR-P6` accueil. Graphe :
A → B → (P4+P5+P1) → P6. P2/P3 (scission de la page bicéphale, renvois inter-modes)
restent **inchangés** ci-dessus, hors de ce lot.

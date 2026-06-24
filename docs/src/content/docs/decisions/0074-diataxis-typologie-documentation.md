---
title: "0074 — Typologie documentaire d'intention (Diátaxis)"
---

## Contexte

La documentation d'Atlas a atteint une **taille critique** : plus de 70 ADR
(Architecture Decision Records — décisions d'architecture tracées), une dizaine
de pages d'architecture, autant de pages qualité/sécurité, des guides de
collaboration, des audits, des plans de résorption, un glossaire. La qualité
**technique** de chaque page est bonne, mais rien ne nomme la **fonction** de
lecture qu'une page sert. Une page peut être juste, à jour et atteignable, tout
en **mélangeant** trois besoins de lecture différents : expliquer _pourquoi_ un
choix a été fait, montrer _comment_ accomplir une tâche, et lister _quels_ faits
consulter. Le lecteur ne sait alors plus où chercher quoi.

Deux ADR cadrent déjà la **structure** de la documentation, chacun sur un **axe**
distinct :

- l'[ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/) pose l'axe
  **audience / profondeur** — _à qui_ on s'adresse et _à quelle distance du code_
  (surface lisible par un non-expert, profondeur experte, doc _inline_ au plus
  près du code) ;
- la règle **R6** de l'[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)
  pose l'axe **thème** — _une page, un sujet_, ce qui déborde migre vers la bonne
  page.

D'autres ADR encadrent la **forme** : l'[ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/)
vise un public non-expert en français, l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
exige une documentation **vérifiable** (chiffres et exemples rattachés au dépôt,
contrôlés par `pnpm audit:docs`). Mais **aucun** axe ne nomme l'**intention**
d'une page — _quel_ besoin de lecture elle sert, et donc _où_ le contributeur
doit écrire quoi. Audience et thème ne suffisent pas : deux pages de même thème
(« le pipeline `citation` ») et de même audience (expert) peuvent répondre à des
intentions opposées — l'une _explique_ le choix de modèle, l'autre _décrit pas-à-pas_
comment lancer le pipeline. Sans ce troisième axe, les pages **dérivent** : une
page de référence se met à raconter le _pourquoi_ d'un ADR, un guide de tâche
recopie des définitions du glossaire, une page d'accueil tente d'être à la fois
tutoriel et référence. Le coût est double — la **redite** (plusieurs sources de
vérité à maintenir en parallèle, qui finissent par diverger) et la **perte du
lecteur**.

**Diátaxis** est le cadre établi qui nomme ce problème et le résout. _Diátaxis_
(du grec _dia-_ « à travers » et _taxis_ « ordonnancement ») distingue **quatre
besoins de lecture** distincts, à ne pas mélanger sur une même page :

- **tutorial** (tutoriel) — _apprendre en faisant_ : un parcours pas-à-pas qui
  amène un débutant à un premier résultat concret ;
- **how-to** (guide pratique) — _accomplir une tâche précise_ : une recette
  orientée objectif, pour qui sait déjà ce qu'il veut faire ;
- **reference** (référence) — _consulter un fait_ : une description exhaustive et
  consultable (on y _cherche_, on ne la _lit_ pas linéairement) ;
- **explanation** (explication) — _comprendre le pourquoi_ : un texte discursif
  qui éclaire un choix, un compromis, une trajectoire. Les ADR et les pages
  d'architecture relèvent presque toujours de ce mode.

Le dépôt jumeau `cluster` a adopté ce même cadre pour sa propre documentation
d'infrastructure ; on en reprend ici le **principe**, adapté au contexte
**applicatif** d'Atlas (TypeScript, monorepo, pipelines de données) — sans
transposer son contenu ni ses conventions (le moteur de doc et l'arborescence
diffèrent). On en retient aussi une **réserve** importante : la pratique de
`cluster` **désavoue tout garde-fou exécutable** sur le classement (le mode d'une
page n'est pas un fait mesurable). On adopte la même prudence ci-dessous.

## Décision

> **On adopte Diátaxis comme troisième axe de structuration de la documentation
> rédigée d'Atlas — l'axe d'_intention_ —, orthogonal à l'axe _audience_
> ([ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/)) et à l'axe
> _thème_ (R6 de l'[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)).
> Chaque page de prose sert _un_ des quatre modes (tutorial, how-to, reference,
> explanation) comme mode _dominant_. Le mode est une propriété qui guide
> l'auteur ; il n'est pas affiché au lecteur sous forme de badge.**

### Trois axes orthogonaux

Une page se situe désormais sur trois axes indépendants, qui se combinent sans se
recouvrir :

| Axe                       | Question                                | Cadre                                                                       |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| **Audience / profondeur** | _À qui_ ? À quelle distance du code ?   | [ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/)              |
| **Thème**                 | _De quoi_ parle la page ?               | R6 — [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) |
| **Intention**             | _Pour quoi faire_ le lecteur vient-il ? | **présent ADR (Diátaxis)**                                                  |

L'orthogonalité est le point clé : on peut être expert (audience) sur le pipeline
`citation` (thème) avec une intention _reference_ (consulter les marts produits)
ou _explanation_ (comprendre le choix de modèle). Diátaxis n'écrase ni ne remplace
les deux axes existants ; il **ajoute la dimension manquante**.

### Une page = un mode dominant

On ne mélange pas, sur une même page, le _pourquoi_ (explanation), le _comment_
(how-to) et le _quoi_ (reference). Quand une page a besoin d'un autre mode, elle
**renvoie** vers la page de cet autre mode par un lien Markdown ordinaire, plutôt
que de **recopier** son contenu. _Pourquoi un mode dominant et non un mode
exclusif ?_ Une page d'architecture qui explique un flux de données cite
forcément des faits ; exiger la pureté absolue serait irréaliste et nuirait à la
lisibilité. On vise donc l'**intention dominante** : la question « qu'est-ce que
le lecteur vient faire ici ? » a une seule bonne réponse par page. _Contre
l'alternative_ « afficher le mode en tête de page sous forme d'étiquette » :
écartée — le mode aide l'auteur à ranger sa prose, il n'aide pas le lecteur, et
un badge alourdirait chaque page sans rien lui apporter (cargo-cult de Diátaxis).

### Articulation avec les ADR de documentation existants

Cet ADR **complète** sans remplacer :

- l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/) régit la
  **vérifiabilité** (une page ne ment pas) ; le présent ADR régit l'**intention**
  (une page a une fonction claire). Une page peut être vérifiable et pourtant
  mélanger les modes — les deux exigences sont orthogonales.
- l'[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) régit
  le **style** au sein d'une page (définir un terme, justifier un choix) et, via
  R6, le **thème** d'une page ; le présent ADR ajoute l'**intention**. R6 dit
  _une page un sujet_ ; Diátaxis dit _une page un besoin de lecture_. Un même
  sujet peut légitimement vivre dans deux pages d'intentions différentes — ce
  n'est pas une violation de R6, c'est sa contrepartie naturelle.

Cet ADR **n'ajoute aucun garde-fou exécutable** : il n'y a pas de contrôle
automatique du « mode » d'une page (le mode est une intention, non un fait
mesurable — c'est aussi le constat assumé par la pratique du dépôt `cluster`). Le
classement reste un **jugement humain**. La typologie s'applique en **revue de
rédaction**, comme un critère de relecture, et l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
(`pnpm audit:docs`) continue de garantir l'exactitude.

## Statut

Accepted (2026-06-24). Couvre la recommandation **B3** (typologie documentaire
d'intention). Ajoute l'axe d'**intention** (Diátaxis) aux axes _audience_
([ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/)) et _thème_
(R6, [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)) ;
complète l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
(vérifiabilité) sans le remplacer ; s'inscrit dans la visée non-experte de
l'[ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/).
L'**adoption** de la typologie (présent ADR) et sa **mise en œuvre** (rangement
des pages, refonte éventuelle de la barre latérale) sont **disjointes** : la mise
en œuvre fera l'objet d'un plan dédié dans `docs/plans/`.

## Mise en œuvre (cartographie indicative)

> **Indicatif, non contraignant.** Ce qui suit est un **plan d'attaque** pour une
> future passe de mise en œuvre, **pas** une restructuration actée par le présent
> ADR. L'**adoption de la typologie** (ci-dessus) et sa **mise en œuvre** (ranger
> les pages, refondre la barre latérale) sont **deux étapes distinctes** : la
> seconde fera l'objet d'un **plan séparé** (`docs/plans/`), au cours duquel
> chaque ligne ci-dessous sera revérifiée et arbitrée. Le tableau classe chaque
> page existante dans **un seul** mode dominant, avec une action proposée.

### Classement des pages de prose

| Page                                                 | Mode        | Justification courte                                                               | Action proposée                                                                            |
| ---------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `index.mdx` (accueil)                                | explanation | Présente le _pourquoi_ de la chaîne de qualité, renvoie aux pages d'attestation.   | Garder                                                                                     |
| `glossary.md`                                        | reference   | Table de termes consultable, on y cherche une définition.                          | Garder                                                                                     |
| `architecture/monorepo.mdx`                          | explanation | Explique _ce qu'est_ un monorepo et _pourquoi_ cette structure.                    | Garder                                                                                     |
| `architecture/packages.md`                           | reference   | Liste exhaustive des paquets (rôle, deps), consultable.                            | Garder                                                                                     |
| `architecture/comprendre-le-code.md`                 | explanation | Guide de lecture (« par où entrer »), discursif, oriente la compréhension.         | Garder                                                                                     |
| `architecture/data-flow.md`                          | explanation | Décrit à haut niveau _comment_ les données circulent, pour comprendre.             | Garder                                                                                     |
| `architecture/tech-choices.md`                       | explanation | Récapitule les choix et surtout le _pourquoi_ / l'alternative écartée.             | Garder                                                                                     |
| `architecture/modele-uplift-fwci.md`                 | explanation | Éclaire qualités, précautions et tests du modèle pour un non-développeur.          | Garder                                                                                     |
| `architecture/re-derivabilite-mart-index.md`         | explanation | Explique le mécanisme de propagation d'une opposition RGPD.                        | Garder                                                                                     |
| `quality/normes.md`                                  | reference   | Bilan consultable des pratiques en place, discipline par discipline.               | Garder                                                                                     |
| `quality/code-style.md`                              | explanation | Justifie _pourquoi_ chaque règle de style et _ce qu'elle coûte_.                   | Garder                                                                                     |
| `quality/tests.md`                                   | explanation | Part du _pourquoi des tests_, discursif sur la pyramide.                           | Garder                                                                                     |
| `quality/security.md`                                | reference   | Inventaire des secrets, surfaces, SAST/DAST, SBOM — consultable.                   | Garder                                                                                     |
| `quality/ci-pipeline.md`                             | reference   | Décrit les étapes du pipeline CI, page consultée pour un fait.                     | Garder                                                                                     |
| `quality/hooks.md`                                   | reference   | Décrit chaque hook Git et ce qu'il vérifie, consultable.                           | Garder                                                                                     |
| `quality/accessibilite.md`                           | reference   | Recense les pratiques a11y appliquées et leurs contrôles.                          | Garder                                                                                     |
| `quality/documentation.mdx`                          | explanation | Expose la _politique_ de doc (langue, niveaux, ton) et son pourquoi.               | Garder                                                                                     |
| `quality/tableau-de-bord.mdx`                        | reference   | Indicateurs de robustesse paquet par paquet, consultable.                          | Garder                                                                                     |
| `quality/incident-response.md`                       | how-to      | Procédure à appliquer en cas d'incident — orientée tâche.                          | Garder                                                                                     |
| `collaboration/workflow.md`                          | how-to      | Décrit le flux standard de contribution branche → PR → merge.                      | Garder                                                                                     |
| `collaboration/environnement-local.md`               | how-to      | _Ce qu'il faut installer_ pour développer — orienté action.                        | Garder                                                                                     |
| `collaboration/installer-les-clis.md`                | how-to      | Installer les CLIs depuis les registres — recette de tâche.                        | Garder                                                                                     |
| `collaboration/parametrage-github.md`                | how-to      | Configurer le dépôt GitHub (protections, secrets) — tâche mainteneur.              | Garder                                                                                     |
| `collaboration/checklist-deploiement.md`             | how-to      | Liste de vérifications avant mise en service d'une instance.                       | Garder                                                                                     |
| `collaboration/releases.md`                          | reference   | Décrit le mécanisme Changesets et les registres de publication.                    | Garder                                                                                     |
| `audit/index.md`                                     | reference   | Index daté des rapports d'audit (état figé à l'instant T).                         | Garder                                                                                     |
| `audit/2026-05-29.md`                                | explanation | Rapport d'audit discursif (constats, notes, recommandations).                      | Garder                                                                                     |
| `audit/2026-06-04-cloud-native.md`                   | explanation | Rapport d'audit cloud-native, discursif.                                           | Garder                                                                                     |
| `audit/2026-06-04-effect-socle.md`                   | explanation | Rapport d'audit du socle Effect, discursif.                                        | Garder                                                                                     |
| `audit/2026-06-15-maturite-referentiels.md`          | explanation | Rapport de maturité (4 référentiels), discursif.                                   | Garder                                                                                     |
| `audit/2026-06-24-uplift-fwci-eunicoast.md`          | explanation | Reconnaissance (spike) consignée, discursive.                                      | Garder                                                                                     |
| `audit/registre-drifts.mdx`                          | reference   | Catalogue consultable des drifts révélés à l'exécution.                            | Garder                                                                                     |
| `plans/index.md`                                     | reference   | Index des plans de résorption, consultable.                                        | Garder                                                                                     |
| `plans/2026-05-30-resorption.md`                     | how-to      | Plan d'action phasé, exécutable étape par étape.                                   | Garder                                                                                     |
| `plans/2026-05-30-resorption-validation.md`          | reference   | Rapport de validation d'un plan (constat figé).                                    | Garder                                                                                     |
| `plans/2026-06-02-pipeline-collaborations.md`        | how-to      | Plan d'implémentation phasé du pipeline.                                           | Garder                                                                                     |
| `plans/2026-06-04-resorption-cloud-native.md`        | how-to      | Plan de résorption phasé.                                                          | Garder                                                                                     |
| `plans/2026-06-04-socle-effect.md`                   | how-to      | Plan de résorption du socle Effect, phasé.                                         | Garder                                                                                     |
| `plans/2026-06-11-producteur-researchers.md`         | how-to      | Plan d'implémentation du mart `researchers`.                                       | Garder                                                                                     |
| `plans/2026-06-11-topologie-depots-cluster-atlas.md` | explanation | Décision et plan transverse — large part discursive sur le _pourquoi_.             | Scinder (la part décision relève d'une explanation / d'un ADR ; la part plan reste how-to) |
| `plans/2026-06-23-mise-en-production-openalex.md`    | how-to      | Plan de mise en production phasé.                                                  | Garder                                                                                     |
| `plans/2026-06-24-uplift-fwci-eunicoast.md`          | how-to      | Plan d'implémentation du modèle d'uplift, phasé.                                   | Garder                                                                                     |
| `plans/documentation-verifiable.md`                  | how-to      | Plan d'action documentation vérifiable.                                            | Garder                                                                                     |
| `decisions/parcours.md`                              | explanation | Parcours de lecture guidé à travers les ADR — discursif, oriente la compréhension. | Garder                                                                                     |
| `decisions/00xx-*.md` (tous les ADR)                 | explanation | Un ADR explique un choix, son contexte et ses conséquences.                        | Garder                                                                                     |

_Lecture du tableau._ La quasi-totalité des pages tombent **proprement** dans un
mode sans déménagement : Atlas suivait déjà l'instinct Diátaxis sans le nommer.
Les **deux familles** dominantes sont _explanation_ (architecture, ADR, audits)
et _how-to_ / _reference_ (collaboration, qualité, plans). **Aucun tutorial
pur** n'existe aujourd'hui : Atlas n'a pas de parcours _learn-by-doing_ (« monte
ton premier environnement de zéro, commande par commande, jusqu'à un résultat
vérifiable »). C'est le **trou** principal que cette typologie révèle — à combler
ou non lors de la passe de mise en œuvre, hors périmètre du présent ADR.

### Esquisse de barre latérale cible

La barre latérale actuelle (`docs/astro.config.mjs`) regroupe les pages par
**dossier thématique** : _Architecture_, _Qualité & sécurité_, _Collaboration_,
_Décisions_, _Audits_, _Plans_. Une barre latérale **alignée sur l'intention**
regrouperait plutôt par **mode**, par exemple :

- **Apprendre** (_tutorial_) — vide aujourd'hui ; accueillerait un futur
  parcours de prise en main pas-à-pas (trou identifié ci-dessus) ;
- **Faire** (_how-to_) — `collaboration/*`, `quality/incident-response`, les
  `plans/*` ;
- **Consulter** (_reference_) — `glossary`, `architecture/packages`,
  `quality/{normes,security,ci-pipeline,hooks,accessibilite,tableau-de-bord}`,
  `collaboration/releases`, les index `audit/`, `plans/` et `registre-drifts` ;
- **Comprendre** (_explanation_) — le reste d'`architecture/*`,
  `quality/{code-style,tests,documentation}`, les rapports d'`audit/*`, les
  `decisions/*` (ADR + `parcours`).

_Ce qui bouge_ par rapport à l'actuel : les groupes ne suivraient **plus** le
dossier mais l'intention, donc des pages aujourd'hui voisines (p. ex.
`architecture/packages` en _reference_ vs `architecture/tech-choices` en
_explanation_) se retrouveraient dans **des groupes différents**. _Inversement_,
des pages aujourd'hui éloignées (un `plan` how-to et la page
`collaboration/workflow`) seraient **regroupées**. Cette esquisse est
**volontairement non câblée** : décider si l'on refond réellement la barre
latérale — et au prix de quel coût pour les liens existants et les habitudes de
navigation — relève du **plan de mise en œuvre séparé**, pas de cet ADR.

## Conséquences

**Bénéfices.** Le lecteur sait **où chercher quoi** : un mode répond à un besoin.
La **redite** recule — un fait a _une_ source de vérité (la page de référence),
que les autres modes **citent** au lieu de recopier. La typologie devient un
**critère de revue** opposable (« cette page d'architecture explique un _comment_
qui relève d'un how-to ») et révèle le **trou tutorial** d'Atlas, masqué jusque-là.
L'axe d'intention **complète** sans bruit les axes audience et thème déjà en place.

**Prix à payer.** Une **discipline de rédaction** : ne pas recopier, mais câbler
vers le bon mode. Le choix du mode dominant reste un **acte humain**, non
automatisable — pas de garde-fou exécutable à ce titre. Quelques pages-frontière
(le plan-décision `2026-06-11-topologie-depots-cluster-atlas`) demandent un
arbitrage au cas par cas lors de la mise en œuvre.

**Garde-fous.** Aucun nouveau contrôle automatique : la typologie s'applique en
**revue de rédaction** (comme la pratique du dépôt `cluster`, qui assume de ne pas
mécaniser le classement). La vérifiabilité reste assurée par `pnpm audit:docs`
([ADR 0028](/atlas/decisions/0028-documentation-verifiable/)) et la charte par
l'[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/). La
cartographie ci-dessus est **indicative** : elle n'engage aucun déplacement de
fichier tant que le plan de mise en œuvre ne l'a pas acté.

## Alternatives écartées

**Ne pas adopter de typologie (statu quo).** Écarté : laisse les pages dériver
(mélange des modes, redite) au fur et à mesure que la doc grossit ; le coût
augmente avec le volume. Les axes audience et thème seuls ne préviennent pas ce
mélange (deux pages même audience, même thème, peuvent confondre _comment_ et
_pourquoi_).

**Afficher le mode en badge sur chaque page.** Écarté : le mode guide l'auteur,
pas le lecteur ; un badge alourdit sans servir personne (cargo-cult de Diátaxis).

**Mécaniser le classement (audit:docs vérifiant le mode).** Écarté : le mode est
une **intention**, pas un fait mesurable ; un contrôle automatique produirait des
faux positifs et un faux sentiment de rigueur. La pratique du dépôt `cluster`
désavoue explicitement tout garde-fou exécutable sur ce point — on s'aligne. Le
classement reste un jugement humain en revue.

**Restructurer la doc dans le même ADR.** Écarté : adopter une typologie et
réorganiser des dizaines de pages (plus la barre latérale et les liens internes)
sont **deux décisions de granularités différentes**. Mélanger l'adoption (légère,
réversible) et la mise en œuvre (lourde, risquée pour les liens) empêcherait de
trancher la première sans s'engager sur la seconde. La mise en œuvre relève d'un
**plan séparé** (`docs/plans/`).

**Transposer la typologie du dépôt `cluster` telle quelle.** Écarté : `cluster`
documente de l'infrastructure avec un autre moteur de doc et une autre
arborescence ; on en reprend le **principe** Diátaxis et sa **réserve** (pas de
garde-fou exécutable), pas le contenu ni le câblage.

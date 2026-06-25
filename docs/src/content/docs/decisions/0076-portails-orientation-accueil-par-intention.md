---
title: "0076 — Portails d'orientation et accueil par intention"
---

## Contexte

L'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/) a adopté
**Diátaxis** comme troisième axe de structuration — l'_intention_ (tutorial,
how-to, reference, explanation) — et **esquissé** une barre latérale regroupée par
intention (« Apprendre », « Faire », « Consulter », « Comprendre ») plutôt que par
dossier thématique. Il a **disjoint** l'adoption de cette typologie de sa **mise en
œuvre**, renvoyée à un plan dédié
([`plans/2026-06-24-mise-en-oeuvre-diataxis`](/atlas/plans/2026-06-24-mise-en-oeuvre-diataxis/)).

Cette bascule par intention **éclate**, par construction, trois familles de pages
aujourd'hui voisines :

- les pages **« bonnes pratiques »** (style de code, hooks, commits, tests, charte
  rédactionnelle, sécurité, accessibilité) sont dispersées entre `quality/` et
  `collaboration/`, et se répartissent désormais entre _Consulter_, _Faire_ et
  _Comprendre_ selon leur intention. Un contributeur qui cherche « les conventions »
  n'a plus de point d'entrée unique ;
- les pages de **gouvernance** (décisions, audits, plans, registre des écarts) —
  qu'on aurait pu réunir sous une catégorie thématique — se retrouvent réparties
  entre _Comprendre_ (les ADR et rapports d'audit, mode explanation), _Faire_ (les
  plans, mode how-to) et _Consulter_ (les index et le registre des drifts, mode
  reference). La lecture transversale « où en est la gouvernance, quels écarts sont
  ouverts » — un **bilan qui s'actualise en continu** — n'a plus de page qui la porte ;
- la **page d'accueil** ([`index.mdx`](/atlas/), template _splash_) ne renvoie
  aujourd'hui vers **aucune** des pages-pivots de l'axe intention. En particulier,
  elle ne lie pas [`quality/normes`](/atlas/quality/normes/) — le **bilan vérifiable
  des pratiques appliquées**, discipline par discipline —, alors que c'est la page la
  plus citée du dépôt. Plusieurs de ses blocs sont **redondants** (un bloc « typage
  strict » dont le propos vit déjà dans [`quality/code-style`](/atlas/quality/code-style/)).

L'axe par intention est le bon choix (acté par l'ADR 0074), mais il **déplace** un
besoin sans le supprimer : celui d'**orienter** un lecteur qui pense en thèmes
(« les conventions », « la gouvernance ») à travers une doc rangée par intention. Ce
besoin ne justifie **pas** de rétablir des catégories thématiques de premier niveau
(ce serait contredire l'ADR 0074) ; il appelle des **points d'entrée transversaux**.

Un **précédent maison** existe : l'[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)
a acté la page _Preuves_ comme une **vitrine d'orientation** qui **pointe vers la
trace** (badges, rapports) sans **jamais recopier** le chiffre. C'est exactement le
patron dont les deux besoins ci-dessus relèvent : une page qui **lie**, ne duplique
pas. Atlas tranche ses patrons de page par ADR ; il serait incohérent de créer deux
nouvelles pages-portails et de refondre l'accueil sans en acter la doctrine.

## Décision

> **On complète l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/)
> par deux *portails d'orientation* — « Bonnes pratiques » et « Gouvernance » — et
> par un *accueil par intention*. Un portail est une page de mode **reference** qui
> **agrège des liens** vers des pages existantes, sans jamais en recopier le contenu
> (patron de l'[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)). L'accueil
> devient une vitrine (mode explanation) qui met en avant le bilan vérifiable
> ([`quality/normes`](/atlas/quality/normes/)) et renvoie vers les pivots de chaque
> intention. Aucune catégorie thématique de premier niveau n'est rétablie : l'axe de
> la barre latérale reste l'intention.**

### Deux portails d'orientation (mode reference)

- **Bonnes pratiques** — une page (`quality/bonnes-pratiques`) qui rassemble, par
  thème, les **liens** vers chaque convention déjà documentée (style de code, Effect,
  hooks, commits, tests, charte rédactionnelle, sécurité, accessibilité, releases) et
  vers l'ADR qui la fonde. Elle **renvoie** au bilan exhaustif
  ([`quality/normes`](/atlas/quality/normes/)) et **déclare** la distinction :
  _Bonnes pratiques_ oriente (« par où entrer, quelle page pour quoi ») ; _Normes et
  pratiques appliquées_ dresse le **bilan vérifiable** discipline par discipline. La
  première cite la seconde, ne la duplique pas (R6, anti-redite —
  [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)).
- **Gouvernance** — une page (`quality/gouvernance`) qui restaure la lecture
  transversale que l'axe intention éclate : **liens** vers l'index des décisions et
  le parcours thématique, l'index des audits, le **registre des drifts**
  ([ADR 0056](/atlas/decisions/0056-registre-drifts/),
  [ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/) —
  entrée canonique des écarts), la matrice de couverture E2E, l'index des plans, et
  les **issues** ouvertes du dépôt. C'est le **bilan qui s'actualise en continu** :
  le registre des drifts est vivant (un drift `ouvert` exige une issue liée au build,
  [ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)),
  et la page le **pointe** sans le recopier.

Ces deux pages **ne sont pas** des catégories de premier niveau : ce sont des pages
de mode reference, rangées dans le groupe « Consulter » de la barre latérale par
intention. Elles ne déplacent **aucun fichier** et ne changent **aucune URL** : elles
ajoutent des points d'entrée, elles ne réorganisent pas le contenu existant.

### Pas d'agrégateur d'issues automatique

Le portail Gouvernance **lie** les issues du dépôt par un **lien externe simple**
(la recherche d'issues GitHub, éventuellement filtrée par étiquette ou jalon). Il
**n'introduit aucun** mécanisme d'agrégation automatique (extraction, mise en cache,
rendu d'issues dans la page). La synchronisation fine « écart ↔ issue » est déjà
assurée, côté écarts, par le registre des drifts
([ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)) ;
le portail s'appuie dessus plutôt que de le redoubler.

### Un accueil par intention

L'accueil reste une page de mode **explanation** (template _splash_) : elle présente
le _pourquoi_ de la chaîne de qualité et **renvoie** vers les pages d'attestation,
sans recopier de chiffre ni de seuil (R2/R5,
[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) ;
vérifiabilité, [ADR 0028](/atlas/decisions/0028-documentation-verifiable/)). Ses
blocs sont réorganisés pour **mettre en avant** le bilan vérifiable
([`quality/normes`](/atlas/quality/normes/), placé en tête) et pour exposer les deux
portails et les pivots de chaque intention. Les blocs redondants (le « typage strict »
autoportant) sont **fondus** dans un bloc qui renvoie à la page de référence, plutôt
que dupliqués.

## Statut

Accepted (2026-06-25). **Complète** l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/)
(axe d'intention) sans le remplacer : la barre latérale reste organisée par intention,
et ces portails en sont des points d'entrée, pas une catégorie thématique
concurrente. **Applique le patron** de l'[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)
(vitrine qui pointe, ne recopie pas) à deux nouveaux portails. **S'appuie sur**
l'[ADR 0056](/atlas/decisions/0056-registre-drifts/) et
l'[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)
(le registre des drifts comme entrée canonique des écarts) et reste régi en exactitude
par l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/) (`pnpm audit:docs`)
et la charte [ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)
(R6, anti-redite). La **mise en œuvre** (écriture des deux portails, refonte de la
barre latérale et de l'accueil) est **disjointe** de cette décision et relève du plan
[`plans/2026-06-24-mise-en-oeuvre-diataxis`](/atlas/plans/2026-06-24-mise-en-oeuvre-diataxis/),
sur le même principe que l'ADR 0074.

## Conséquences

**Bénéfices.** Un lecteur qui pense en thèmes (« les conventions », « la
gouvernance ») retrouve un **point d'entrée unique** sans qu'on rétablisse des
catégories thématiques de premier niveau — l'axe intention reste intact. Le **bilan
vérifiable** ([`quality/normes`](/atlas/quality/normes/)) cesse d'être invisible
depuis l'accueil. La lecture « bilan continu » de la gouvernance (décisions, audits,
écarts ouverts, plans) est **portée par une page** au lieu d'être éclatée. La
**redite recule** : les portails et l'accueil **citent** au lieu de recopier, un fait
gardant une seule source de vérité (la page de référence).

**Prix à payer.** Deux pages de plus à **maintenir** : un lien mort dans un portail
est un lien mort de plus (mais `pnpm docs:build` échoue sur lien interne cassé, donc
le coût est borné). La **discipline anti-redite** doit être tenue : un portail qui se
met à recopier un chiffre redeviendrait une source de vérité concurrente — c'est
précisément ce que la règle « pointer, pas recopier » interdit.

**Garde-fous.** Les portails **ne recopient jamais** un fait : ils lient (patron
[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)). Aucune **catégorie de
premier niveau** thématique n'est créée (l'axe reste l'intention, ADR 0074). Aucun
**fichier déplacé**, aucune **URL changée** par cette décision (purement additive) :
la mise en œuvre reste réversible d'un `git revert`. Aucun **agrégateur d'issues
automatique**. La vérifiabilité reste garantie par `pnpm audit:docs`
([ADR 0028](/atlas/decisions/0028-documentation-verifiable/)) — dont le contrôle de
pages orphelines impose que toute page de portail soit liée dans la barre latérale —
et l'anti-redite par R6 ([ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)).

## Alternatives écartées

**Rétablir des catégories thématiques de premier niveau** (« Bonnes pratiques »,
« Gouvernance » comme groupes de la barre latérale). Écarté : cela **contredirait**
l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/), qui range la
barre latérale par intention. On obtient l'orientation thématique recherchée par des
**pages** reference (dans « Consulter »), pas par des **groupes** concurrents de
l'axe intention.

**Déplacer les pages « bonnes pratiques » dans un dossier dédié** (`practices/`).
Écarté : déplacer des fichiers **change leurs URLs** et casse les liens entrants
(ADR, README racine), pour un bénéfice nul — un portail qui lie l'existant rend le
même service **sans** toucher aux URLs. Le coût (risque de liens cassés) est réel, le
gain inexistant.

**Agréger les issues GitHub dans la page de gouvernance** (extraction et rendu
automatiques). Écarté : c'est un outillage à maintenir (authentification, cache,
rendu) pour un besoin déjà couvert — le registre des drifts lie chaque écart `ouvert`
à une issue au build ([ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)).
Un lien externe simple suffit ; on ne redouble pas un mécanisme existant.

**Tout mettre dans le plan, sans ADR.** Écarté : les deux portails introduisent un
**patron de page** (orientation qui pointe sans recopier) et une **articulation** avec
les ADR 0070/0071/0052 (anti-doublon, entrée canonique des écarts) qui sont des
décisions opposables en revue, pas un simple câblage. Le précédent
[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/) a acté un patron de page
de même nature ; la cohérence impose un ADR ici aussi. L'adoption (légère) reste
**disjointe** de la mise en œuvre (le plan), comme pour l'ADR 0074.

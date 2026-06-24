---
title: "0071 — Méta-gouvernance documentaire exécutable et cartographie de la couverture E2E"
---

## Contexte

Atlas tient un appareil de pilotage documentaire dense et déjà largement outillé :
une **série d'ADR** numérotée (`docs/decisions/`), un **registre de drifts** indexé
([ADR 0056](/atlas/decisions/0056-registre-drifts/)), des **reconnaissances**
consignées ([ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)),
une **cadence d'audit transverse** ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)),
et une **documentation vérifiable** ([ADR 0028](/atlas/decisions/0028-documentation-verifiable/))
qui empêche déjà la doc _rédigée_ de mentir sur le code via `pnpm audit:docs`
(`scripts/audit/documentation.mjs`). Cet appareil garde pourtant **trois angles
morts** que le volume rend visibles.

**1. Le registre de drifts est une capacité à moitié câblée.** Le registre
([ADR 0056](/atlas/decisions/0056-registre-drifts/)) consigne un écart révélé à
l'exécution avec un `statut` (`corrige`, `caduc`, `ouvert`). Un drift `ouvert`
est un écart **non encore résolu** — mais **rien ne pilote sa résolution** : le
schéma Zod (`docs/src/content.config.ts`) accepte `statut: "ouvert"` sans exiger
de pointeur vers le travail qui le fermera. Un écart connu peut donc rester
ouvert indéfiniment sans qu'aucune issue ne le suive, ce qui contredit l'esprit
« un changement se reflète dans la même trace » de l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/).

**2. Les conventions de gouvernance ne s'auto-vérifient pas.**
`scripts/audit/documentation.mjs` contrôle la doc _rédigée_ (README présent,
liens internes valides, ADR référencé existant, page non orpheline, compteur
« N ADR » exact — fonction `staleAdrCounts`, charte
[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/), règle R8).
Mais **personne ne vérifie la cohérence de l'index ADR lui-même** : que
`decisions/index.md` liste **tous** les fichiers `NNNN-*.md`, sans trou ni doublon
de numéro, et que le **statut** affiché dans l'index concorde avec le statut réel
du fichier (un ADR _superseded_ doit l'être des deux côtés). Une incohérence de
ce genre ne se voit qu'à la prochaine revue humaine, **épisodique** — une
gouvernance qui ne s'auto-vérifie pas **périme en silence**, le travers même que
l'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/) combat pour les
audits.

**3. La couverture des tests de bout en bout n'est cartographiée nulle part.**
La pyramide de tests d'Atlas est décrite ([`quality/tests`](/atlas/quality/tests/))
: cinq niveaux, dont trois **_self-skipping_** (qui se désactivent quand leur
environnement n'est pas démarré) — contrats REDCap, authentification Appwrite,
_smoke end-to-end_. Le _self-skip_ est un **choix de conception assumé**
([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) : un
contributeur sans Docker lance `pnpm test` sans erreur. Mais **aucune page ne
croise** les chaînes du dépôt (les applications, les contrats externes, le
pipeline DataOps) avec leurs niveaux de test et leur **état réel d'exécution**
(« a-t-il déjà tourné en vrai ? »). La mémoire des écarts E2E est **réactive**
(le registre de drifts, post-mortem) mais **non cartographiée** : on ne sait pas,
d'un coup d'œil, où sont les **trous connus** — par exemple un _smoke_ qui se
saute silencieusement si REDCap (la plateforme de saisie de formulaires
structurés qu'Atlas pilote) est absent.

Le dépôt voisin `cluster` a outillé ces deux besoins : un **audit régulier des
conventions de gouvernance** (ADR cluster 0060) et une **matrice de couverture**
de ses scénarios (pages `matrice-catalogue.md` / `plan-de-tests.md`). On s'en
**inspire**, sans transposer son contexte : `cluster` cartographie une
**infrastructure** (matériel, topologie, banc) ; Atlas, lui, **déploie _sur_ ce
cluster** ([ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)) — il n'a ni
matériel ni topologie à cartographier. On garde la **forme** (un audit qui
signale, une matrice qui nomme les trous), pas les **axes infra**.

## Décision

> **La gouvernance documentaire d'Atlas devient elle-même exécutable, en trois
> volets concrets : (a) le registre de drifts est durci AU BUILD — un drift
> `ouvert` doit porter une issue ; (b) l'audit documentaire croise l'index ADR
> avec les fichiers par statut ; (c) une page de matrice cartographie la
> couverture de bout en bout, trous nommés compris.**

### Volet (a) — Registre de drifts vivant : `ouvert` ⇒ `issue`, durci au build

On ajoute au schéma Zod de la collection `drifts` (`docs/src/content.config.ts`,
[ADR 0056](/atlas/decisions/0056-registre-drifts/)) :

- un champ **`issue` optionnel** (URL ou numéro de l'issue de suivi) ;
- un **`superRefine`** qui **exige** une `issue` non vide **quand
  `statut === "ouvert"`** (les statuts terminaux `corrige` et `caduc` n'en
  demandent pas — l'écart est clos ou caduc, plus rien à suivre).

Le contrôle s'arme là où le registre se valide déjà : **au `docs:build`**. Un
drift déclaré `ouvert` sans issue **fait échouer le build** (et donc la CI),
exactement comme une entrée malformée aujourd'hui. _Pourquoi durcir au build, et
non par convention humaine ?_ Côté `cluster`, lier une issue à un drift ouvert est
une **discipline de rédaction** ; Atlas peut faire **mieux** parce que son
registre est déjà une _content collection_ validée par un schéma — on transforme
la convention en **invariant mécanique** quasi gratuitement (≈ six lignes, aucune
dépendance ni job nouveau, le contrôle monte sur le gate `docs:build` existant).
_Contre l'alternative_ « rappel en revue » : elle laisse passer l'oubli jusqu'à
la prochaine paire d'yeux ; le build, lui, ne pardonne pas. _Objection « zéro
drift ouvert aujourd'hui »_ : c'est précisément le bon moment — l'invariant est
posé **avant** le premier drift ouvert, pas rétro-ajusté sur une dette ;
`ouvert` est un statut de première classe et mérite son garde-fou. Cette symétrie
prolonge l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (« un
changement se reflète dans la même trace ») : un drift Atlas ouvert **lie** une
issue Atlas.

### Volet (b) — `check_index` : croiser l'index ADR avec les fichiers, par statut

On étend `scripts/audit/documentation.mjs` d'une fonction pure **`check_index`**,
à côté de `staleAdrCounts`, **testée** dans `documentation.test.mjs` (le parsing
du tableau Markdown de l'index et des frontmatter, plus la logique de
concordance, sont non triviaux — ils méritent des tests, au modèle des fonctions
existantes du fichier). Elle croise `decisions/index.md` ↔ les fichiers
`NNNN-*.md` et signale :

1. **un trou de numéro** — un `NNNN` listé dans l'index sans fichier, ou un
   fichier sans ligne d'index ;
2. **un doublon de numéro** — deux fichiers ou deux lignes pour le même `NNNN` ;
3. **un statut discordant** — le statut affiché dans l'index (colonne « Statut »)
   ne concorde pas avec le **premier mot** du `## Statut` du fichier (`Accepted`,
   `Superseded`, `Deprecated`). Un ADR _superseded_ doit l'être **des deux
   côtés**.

Ce contrôle vit dans l'audit documentaire existant — **bloquant** en pre-push et
en CI, comme le reste de `documentation.mjs` : un index ADR incohérent est un
défaut **factuel et dérivable du code**, donc du ressort de l'anti-dérive de
l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/), pas une question de
goût rédactionnel. _Pourquoi étendre `documentation.mjs` plutôt qu'un nouveau
script ?_ La logique (lecture des fichiers ADR, parsing du frontmatter et des
liens) y est **déjà** ; ajouter une fonction testée à côté de `staleAdrCounts`
réutilise l'infrastructure au lieu de la dupliquer. _Contre l'alternative_
« script shell jetable » : parser le tableau de 68 lignes d'index et croiser les
statuts est une logique de cohérence qui mérite des **tests**, pas du shell
fragile.

### Volet (c) — Page `quality/matrice-e2e.md` : cartographier la couverture, trous compris

On ajoute une page `docs/src/content/docs/quality/matrice-e2e.md` : un **tableau**
croisant les **chaînes propres à Atlas** × leurs **niveaux de test**
(unitaire / intégration / E2E) × **« a-t-il déjà tourné en vrai ? »**, complété
d'une liste explicite des **trous nommés**. Les chaînes cartographiées sont celles
du dépôt, pas une infrastructure :

- **applications SvelteKit** — _smoke end-to-end_ Playwright (le pilote de
  navigateur) sur `amarre` et `sillage`, niveaux unitaire et intégration en
  vitest ;
- **contrats externes** — tests de contrat REDCap (`cli/crf-openapi`,
  `apps/crf-dashboard`) et flux d'authentification Appwrite (le _backend-as-a-
  service_ qui gère l'authentification, `packages/baas`, `apps/sillage`), tous
  deux _self-skipping_ ;
- **chaîne DataOps de bout en bout** — ingestion → orchestration Dagster →
  transformations dbt → traçabilité de lignage → suivi de dérive
  ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/),
  [ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/)).

Les **trous connus** sont **nommés**, pas tus — au premier rang, le _smoke_
**skippable si REDCap est absent** : un test qui se saute silencieusement n'est
pas un échec, mais un **état** qui doit être **visible**. _Pourquoi nommer le trou
plutôt qu'armer une porte bloquante ?_ Forcer ce _smoke_ à échouer quand REDCap
manque rouvrirait le piège que l'[ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)
écarte (une CI rouge pour une dépendance absente, sans rapport avec le code
poussé) et contredirait le _self-skip_ assumé par
l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/) ; la
matrice **rend l'état lisible** sans gate qui frictionnerait au mauvais moment.

La cohérence de la page est **vérifiée** : un **miroir testé doc ↔ specs**
contrôle que les chaînes listées dans la matrice correspondent aux fichiers de
test réels (`*.spec.ts` côté Node, `test_*.py` côté DataOps) — la matrice ne peut
donc pas dériver des tests sans que le contrôle bronche, dans l'esprit de
l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/).

### Ce que cette décision EXCLUT explicitement

On **n'ajoute pas** de bloc « le dépôt en chiffres » régénéré dans le README (ADR
par statut, plans, drifts, duplication). _Pourquoi l'exclure ?_ Ces compteurs
sont une **donnée volatile**, non reproductible octet par octet depuis l'arbre
Git — exactement le cas que l'[ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/)
réserve à une **série _append-only_** auditée pour sa cohérence structurelle, et
**jamais** à un fichier diff-checké. Y glisser un bloc régénéré dans le README
rouvrirait le faux positif que 0032 ferme. La volatilité de gouvernance, si on la
veut un jour, ira dans la série _append-only_ existante, pas ici.

## Statut

Accepted (2026-06-24). **Amende** l'[ADR 0056](/atlas/decisions/0056-registre-drifts/)
(le registre devient _vivant_ : un drift `ouvert` lie une issue, durci au build) et
**étend** l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/) (la
vérifiabilité couvre désormais la cohérence de l'**index ADR** et le miroir
doc ↔ specs de la matrice), dans l'esprit de l'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)
(une gouvernance qui ne s'auto-vérifie pas périme en silence). S'appuie sur
l'[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)
(compteurs exacts, R8), l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)
(_self-skip_ assumé) et l'[ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)
(pas de gate sur dépendance absente). N'invalide aucun ADR. Inspiré de la pratique
du dépôt `cluster` (ADR cluster 0060, audit régulier des conventions ; pages
`matrice-catalogue.md` / `plan-de-tests.md`, cartographie de couverture), sur le
modèle de crédit de l'[ADR 0056](/atlas/decisions/0056-registre-drifts/) — le
contenu reste propre à Atlas (aucun axe matériel, topologie ou banc : Atlas
déploie **sur** le cluster, [ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)).

## Conséquences

**Bénéfices.**

- **Le registre devient pilotable** : un drift `ouvert` ne peut plus stagner sans
  issue de suivi — le `docs:build` le refuse. La capacité de l'[ADR 0056](/atlas/decisions/0056-registre-drifts/)
  passe de « moitié câblée » à **invariant mécanique**, quasi gratuitement.
- **L'index ADR s'auto-vérifie** : trou, doublon ou statut discordant sont
  **signalés en CI**, plus seulement à la revue humaine épisodique — le travers
  « périmer en silence » est neutralisé pour la table d'index.
- **La couverture E2E devient lisible** : on voit d'un coup d'œil quelles chaînes
  ont tourné en vrai et **où sont les trous**, le _smoke_ skippable nommé compris.
  La mémoire E2E cesse d'être seulement réactive (le registre, post-mortem) pour
  devenir **cartographiée**.

**Prix à payer.**

- Un peu de **cérémonie** : ouvrir une issue dès qu'un drift est déclaré
  `ouvert`, tenir la matrice à jour quand une chaîne de test apparaît ou change.
  Le miroir doc ↔ specs **signale** une dérive, mais la matrice reste une page
  rédigée à maintenir.
- Trois petites surfaces à porter : ≈ six lignes de Zod, une fonction testée dans
  `documentation.mjs`, une page de doc avec son test de miroir. Léger, mais non nul.

**Garde-fous.**

- **En revue de PR**, un drift `ouvert` sans issue ne **passe pas** (échec
  `docs:build`) ; un index ADR incohérent ne passe pas (`pnpm audit:docs`,
  bloquant). Les deux sont opposables et tracés.
- Les niveaux _self-skipping_ restent **non bloquants** quand leur environnement
  est absent ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/),
  [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)) : la matrice rend
  l'état **visible**, elle n'arme aucune porte qui rouvrirait ce piège.
- **Aucun compteur volatil** n'est diff-checké : toute statistique de gouvernance
  qu'on voudrait un jour afficher relève de la série _append-only_ de
  l'[ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/), jamais d'un
  bloc régénéré dans le README.
- Le périmètre reste le **dépôt de code** : on vérifie des conventions internes
  (cohérence d'index, registre, miroir de tests), jamais une décision propre à un
  organisme déployeur ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).

## Alternatives écartées

- **Laisser le registre de drifts en convention humaine** (lier l'issue « quand on
  y pense »). Écarté : Atlas peut faire **mieux** que `cluster` ici, parce que son
  registre est déjà un schéma Zod validé au build — durcir l'invariant coûte
  quelques lignes et supprime l'oubli à la source.
- **Porter tel quel l'audit de gouvernance de `cluster` (un script dédié + cron +
  bloc de statistiques).** Écarté : trois familles de ce script n'ont pas de
  support Atlas, son bloc de chiffres **heurte l'[ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/)**,
  et la valeur anti-doc-rot des compteurs « N ADR » est **déjà faite**
  (`staleAdrCounts`). On en garde le **noyau utile** — le croisement index ↔
  fichiers par statut — greffé sur `documentation.mjs`, pas un script de plus.
- **Tout en shell.** Écarté : parser le tableau d'index, croiser 68 statuts et
  valider le miroir doc ↔ specs est une logique de cohérence non triviale → des
  fonctions pures **testées** au modèle de `documentation.mjs`, pas du shell
  jetable.
- **Cartographier l'infrastructure (matériel, topologie, banc), à la manière de la
  matrice `cluster`.** Écarté : Atlas **déploie sur** le cluster
  ([ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)), il ne monte pas de
  bancs ; sa matrice cartographie ses **chaînes de test** (applications, contrats
  externes, pipeline DataOps), pas une infrastructure qu'il ne possède pas.

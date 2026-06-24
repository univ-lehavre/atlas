---
title: "Best-of cluster ↔ Atlas — audit comparatif de la documentation (2026-06-24)"
---

> Date de l'audit : 2026-06-24. Méthode : workflow multi-agents (cartographie 5 dimensions
> × 2 dépôts, comparaison, re-vérification adversariale 3-lentilles « déjà-présent /
> transposable / valeur », critique de complétude, perspective inverse). Périmètre : toute la
> documentation versionnée des dépôts `atlas` et `cluster`. Findings actionnables → ADR 0069–0074
> et issues. Rapport jumeau : [Véracité de la documentation](/atlas/audit/2026-06-24-veracite-documentation/).

> Statut : livrable de décision, opposable. Consolide le baseline (22 recos, 8 propositions d'ADR, section « ne pas copier ») et le **durcit** avec : la re-vérification 3-lentilles (déjà-présent / transposable / valeur), les critiques de complétude (angles morts + 2 points qualité perdus), et la perspective inverse (forces Atlas à mettre en vitrine).
> Faits porteurs re-vérifiés au moment de l'écriture : dernier ADR = **0068** (les nouveaux numéros partent de **0069**, à reconfirmer au commit) ; `CITATION.cff` **absent** ; pas de `scorecard.yml` ; `README.md:95` et `glossary.md:40` affirment encore VitePress alors que `README.md:99` dit Astro Starlight ; `SECURITY.md:50` revendique SLSA Build L3 ; le schéma Zod des drifts (`docs/src/content.config.ts:37`) accepte `statut: "ouvert"` sans champ `issue`.

---

## 1. Synthèse exécutive

Le baseline tenait : Atlas est déjà rigoureux (68 ADR, DevSecOps in-repo, doc vérifiable mécanisée), mais sa doctrine est **dispersée** et **sous-exposée**, et il porte quelques **dettes factuelles** (sur-revendications, dérives de doc). La re-vérification 3-lentilles **confirme cette lecture mais redistribue les priorités** : plusieurs recos « hautes » du baseline étaient en réalité de la **cérémonie importée** (Scorecard, manifeste, principe-chapeau, doctrine badges), tandis que les gains nets se concentrent sur **3 corrections factuelles à coût quasi nul** et **2 complétions de capacités à moitié câblées**.

Bilan des statuts (15 recos re-vérifiées) :

| Statut durci                                 | Nombre | Recos                                                  |
| -------------------------------------------- | ------ | ------------------------------------------------------ |
| **Confirmée 3/3**                            | 5      | H2, H7, H9, M2, M3                                     |
| **Nuancée 2/3** (retenue avec réserve forte) | 6      | H1, H3, H4, H8, M1, M4, M6, M8 → _voir §3 pour le tri_ |
| **Écartée**                                  | 5      | H5, H6, M5, M7, B1, B2 (+ B3, B4 nuancées-vers-écart)  |

Surtout, la re-vérification **renverse 2 verdicts hauts du baseline** : **H1 (Scorecard)** et **H4 (posture d'adoption)** perdent leur lentille VALEUR et **rétrogradent** ; les vrais mouvements phares deviennent **H2 (signer/scanner images)**, **H3 (corriger SLSA L3)**, **H9 (corriger VitePress→Starlight)**, **H7 (CITATION.cff)** et **M2 (registre de drifts vivant)** — du concret, vérifiable, peu coûteux.

**Les 5 mouvements phares révisés** (remplacent les 5 du baseline) :

1. **Trivy + cosign/SLSA sur les 7 images GHCR** (H2) — scan d'abord (G2, « meilleur rapport impact/effort »), signature/provenance ensuite (G1).
2. **Corriger la sur-revendication SLSA Build L3** dans `SECURITY.md:50` (H3) — exactitude publique, ~1 mot.
3. **Corriger la dérive VitePress→Astro Starlight** dans `README.md:95` + `glossary.md:40` (H9) — auto-contradiction factuelle dans le point d'entrée le plus lu.
4. **Créer `CITATION.cff` racine** avec le DOI Zenodo déjà en service (H7) — le bouton « Cite » est cassé aujourd'hui.
5. **Durcir le registre de drifts en registre vivant** : `issue` requis si `ouvert`, via `superRefine`/`discriminatedUnion` dans `content.config.ts` (M2).

---

## 2. Tableau par dimension (durci)

| Dimension                                       | Verdict durci                 | Évidence                                                                                                                      | Geste                       |
| ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Supply-chain / images**                       | Trou réel confirmé 3/3        | `images.yml:209-227` sans cosign/Trivy/provenance ; audit interne G1/G2 (`audit/2026-06-15-maturite-referentiels.md:195-196`) | H2 — Trivy puis cosign/SLSA |
| **Exactitude des claims sécurité**              | Dette factuelle confirmée     | `SECURITY.md:50` (SLSA L3 ≠ L2 npm/L0 images), déjà tracé G13 + issue #400                                                    | H3                          |
| **Exactitude de la doc**                        | Dérive factuelle confirmée    | `README.md:95`/`glossary.md:40` VitePress vs `README.md:99` Starlight (ADR 0036)                                              | H9                          |
| **Citabilité académique**                       | Trou confirmé                 | `CITATION.cff` absent ; DOI Zenodo déjà actif (`README.md:3`) ; plan topologie:128                                            | H7                          |
| **Registre de drifts**                          | Capacité à moitié câblée      | `content.config.ts:37` accepte `ouvert` sans `issue` ; ADR 0056 sans couplage                                                 | M2                          |
| **Property-based testing**                      | Asymétrie TS/Python confirmée | fast-check en TS (`packages/validators`), absent dataops Python (pyproject sans Hypothesis)                                   | M3                          |
| **Gouvernance mécanisée**                       | Trou réel (angle mort)        | `documentation.mjs` couvre la doc rédigée, pas ADR↔plan↔index par statut                                                      | A1 (§5, nouvelle)           |
| **Couverture E2E cartographiée**                | Trou réel (angle mort)        | 2 smoke Playwright, aucune matrice scénario×chaîne×statut                                                                     | A2 (§5, nouvelle)           |
| **Posture sécurité / RGPD / a11y / MLOps**      | **Forces sous-exposées**      | ADR 0018/0026/0030/0038/0067/0068 réels                                                                                       | Vitrine §6                  |
| **Méta-gouvernance (posture, chapeau, badges)** | Cérémonie pour Atlas          | voir §4                                                                                                                       | Écarter / replier           |

---

## 3. Les 22 recos avec statut durci

### Confirmées 3/3 — à faire

**H2 — Signer et scanner les 7 images GHCR (cosign keyless + provenance SLSA + Trivy).** `confirmée`.
Les 3 lentilles passent ; valeur **re-priorisée** : le scan Trivy (G2) a une valeur **immédiate et autoportante** (CVE sur le livrable réellement déployé : `apps/atlas-dashboard/Dockerfile`, `services/crf/Dockerfile`), la signature/provenance (G1) a une valeur aujourd'hui **latente** (aucun consommateur ne vérifie — cluster ne référence aucune image `ghcr.io/univ-lehavre/atlas`, `verifyImages` seulement « Proposed » cluster 0075:219) mais reste utile (provenance vivante + lève l'incohérence `SECURITY.md:50`). **Ordre imposé : Trivy d'abord, cosign/SLSA ensuite.** OIDC keyless déjà maîtrisé (`release.yml:38-41`), zéro clé, zéro fichier à tenir.

**H7 — Créer `CITATION.cff` racine avec le DOI Zenodo.** `confirmée`.
Absent (vérifié), DOI réel déjà en service (`README.md:3`, `10.5281/zenodo.18310357`), planifié par Atlas lui-même (plan topologie:128). **Réserve de contenu (ADR 0032)** : **omettre** `version:`/`date-released:` (le `package.json` racine n'a pas de `version` ; ces champs CFF sont optionnels et volatils) — ancrer sur le concept-DOI seul. Fichier statique ~20 lignes, aucune friction CI.

**H9 — Corriger la dérive VitePress→Astro Starlight.** `confirmée`.
Auto-contradiction interne dans le point d'entrée le plus lu (`README.md:95` vs `:99`) + définition de glossaire factuellement fausse (`glossary.md:40`). Non captée par `audit:docs` (`documentation.mjs` ne valide aucun nom d'outil) ni par le registre de drifts. **Portée corrigée par la re-vérif** : ne corriger que les **assertions au présent** (README:95, glossary:40) ; **remplacer** la définition de glossaire par « Astro Starlight » plutôt que la supprimer ; VitePress reste **légitime au passé** dans les ADR/plans historiques (0036, parcours).

**M2 — Registre de drifts vivant (`ouvert` ⇒ `issue` + `superRefine`).** `confirmée`.
Capacité à moitié câblée : le composant compte déjà les ouverts mais rien ne pilote leur résolution. Correctif ~6 lignes dans `content.config.ts` (champ `issue` optionnel + `superRefine`), aucune dépendance/job nouveau (monte sur le gate `docs:build`). **Objection « 0 drift ouvert aujourd'hui »** traitée : assurance bon marché avant le premier drift ouvert, pas une dette permanente — `ouvert` est un statut de première classe. Symétrie ADR 0033 renforcée (un drift Atlas lie une issue Atlas).

**M3 — Étendre fast-check vers Hypothesis au dataops Python + ADR.** `confirmée`.
Asymétrie réelle : fast-check côté TS (6 fichiers `*.property.test.ts`), pytest example-based côté Python. Cibles concrètes : parsers d'entrée non fiable (`gkg.py` parse_master_list/project_csv/\_split_enhanced_organizations, `ror.py` project_record) et dérivations bornées (`uplift_model.py:190`). Hypothesis se branche via `@given` sans bascule de framework (1 dev-dep épinglée par code-location). **Réserve honnête** : la motivation badge Scorecard Fuzzing de cluster 0087 ne transpose pas (effet de bord même côté cluster) — la valeur première (robustesse des parsers sur entrée hostile) tient seule.

### Nuancées 2/3 — retenues avec réserve, mais re-priorisées

**H3 — Corriger la sur-revendication SLSA Build L3.** `nuancée` (lentille déjà-présent : écarter — ce n'est **pas** nouveau).
**Tranché : à faire, mais NE PAS la présenter comme une découverte.** C'est un finding **déjà documenté, qualifié et tracké** dans Atlas : G13 (`audit/2026-06-15-maturite-referentiels.md:207`), catalogue (`audit/index.md:78`), **issue #400 ouverte** (checkbox explicite). Transposable (origine native Atlas, pas cluster — `grep slsa|cosign` cluster/decisions = 0) et valeur réelle (exactitude publique, coût ~1 mot, asymétrie réputationnelle d'une fausse revendication sécurité). **Action : éditer `SECURITY.md:50` → « SLSA Build L2 (npm) / L0 (images) » et cocher #400.** Reste un mouvement phare _par son ratio_, pas par sa nouveauté.

**H1 — OpenSSF Scorecard en CI + badge README.** `nuancée` → **RÉTROGRADÉE de haute à basse, à différer.**
La re-vérif **renverse le verdict baseline**. Déjà-présent : retenir (vrai zéro Atlas). Transposable : retenir (workflow GitHub générique, actions déjà SHA-pinned). **Mais la lentille VALEUR écarte**, et c'est décisif : (1) Scorecard **mesure** une hygiène qu'Atlas **implémente déjà** (Pinned-Deps 100 %, Token-Permissions 13/14, SAST, Dependabot, Security-Policy, Branch-Protection) — il ne crée aucun contrôle ; (2) les vrais trous supply-chain (G1/G2/G10) sont des **contrôles manquants, pas un score manquant** — aucun n'est résolu par Scorecard ; (3) l'audit interne ne le recommande pas ; (4) coût > gain pour un dépôt **bus-factor 1** (CODEOWNERS:9, ADR 0027) : PAT fine-grained `SCORECARD_TOKEN` à rotater + run hebdo + fichier à tenir, score que personne n'est staffé pour exploiter. **Décision : différer.** Si jamais on l'adopte, ce sera comme **conséquence** de la doctrine badge honnête (cf. H8/vitrine), pas comme objectif.

**H4 — Acter une posture d'adoption bornée + critère coût de diversité.** `nuancée` → **RÉTROGRADÉE de haute à écartée-faible.**
La re-vérif **renverse le verdict baseline**. Déjà-présent : retenir (absent nommément). Transposable : retenir (méta-gouvernance, pas infra). **Mais VALEUR écarte fermement** : (1) le problème de cluster (dépôt polyglotte de fait, résidu Perl) **n'existe pas** chez Atlas (mono-langage + une frontière Python délibérée déjà tranchée par 0055:154) ; (2) le « biais adoptif » est déjà en acte sans chapeau (68 ADR de délibération case-par-case) et les garde-fous proposés sont déjà des invariants (supersession tracée 0002/0011/0022/0035/0042, « toute décision structurante = un ADR » CLAUDE.md) — **acter par ADR qu'on décide par ADR est une tautologie** ; (3) coût concret (69e ADR-chapeau, confusion avec 0035, outillage `check:gouvernance` qu'Atlas n'a pas). **Décision : ne pas créer d'ADR-chapeau.** Le seul résidu utile (nommer le « coût de diversité ») peut être **une phrase ajoutée à 0055**, pas un chapeau. Voir aussi l'angle mort A6 (§5) qui reformule la part vraiment manquante.

**H8 — Doctrine de badges README anti-décoratif.** `nuancée` → **conditionnelle, liée à la vitrine.**
Déjà-présent + transposable : retenir (vrai zéro ; aligne sur 0032 ; atout a11y WCAG AA réel via ADR 0038). **VALEUR écarte en l'état** : Atlas n'a que 2 badges DOI honnêtes, aucune « rangée » à ordonner, **aucun substrat de badge dynamique câblé** (pas de scorecard.yml ni de feeder CI), et la famille a11y est **différée même chez cluster** (pa11y-ci obsolète). **Tranché : la doctrine badge n'a de valeur que si elle accompagne la mise en vitrine des forces Atlas (§6).** Donc : **ne pas créer un ADR badge isolé** ; en faire la **section « honnêteté des badges » de l'ADR vitrine** (cf. §5 A4) qui, lui, câble réellement les signaux (a11y, CI) que la doctrine gouvernerait. Sans signal à exposer, c'est de la gouvernance préventive ; avec les signaux de §6, elle devient le garde-fou nécessaire.

**M1 — Check de gouvernance exécutable (`audit:gouvernance` en .mjs).** `nuancée`.
Déjà-présent + transposable : retenir (extension utile : croisement index ADR↔fichier par statut, conformité plans, validation drifts — absents de `documentation.mjs`). **VALEUR écarte le _packaging_** (nouveau fichier + cron + bloc STATS) mais **pas le noyau** : 3/5 familles cluster n'ont pas de support Atlas (le bloc STATS heurte 0032), la valeur phare anti-doc-rot des compteurs est **déjà faite** (`staleAdrCounts`/W7). **Tranché : ne PAS porter `check_gouvernance.py` tel quel ; étendre `documentation.mjs`** d'une fonction `check_index` (tout `0NNN` listé, pas de doublon, statut index == 1er mot du `## Statut` du fichier) à côté de W7, testée dans `documentation.test.mjs`. Voir la consolidation avec A1 en §5.

**M4 — Gate anti-faux-succès E2E Playwright.** `nuancée`.
Déjà-présent + transposable : retenir (le faux-succès vert tout-skippé existe par design — `e2e.yml:74-77`, `smoke.spec.ts:41-44`, `passWithNoTests:true` ; l'audit interne le recommande déjà `audit/2026-05-29.md:159-160`). **VALEUR écarte** : surface minuscule (1 smoke/sandbox, nightly non bloquant), mode de défaillance qui ne se matérialise pas (REDCap présent ⇒ stack montée et test réel ; absent ⇒ warning explicite, pas vert trompeur), et **0057 a déjà tranché** le self-skip comme choix de design assumé. **Tranché : ne pas créer un gate dédié.** Replier le besoin dans **A2 (matrice E2E, §5)** : nommer explicitement « smoke skippable si REDCap absent » comme trou connu, ce qui rend l'état visible sans gate bloquant qui rouvrirait le piège ADR 0034 (`0034-ci-adaptative-par-chemin.md:112-116`).

**M6 — Inventaire bonnes pratiques par culture + rafraîchir `normes.md`.** `nuancée`.
**Scinder les deux volets.** _Volet rafraîchissement_ : `retenir` — **dette réelle et vérifiée** : `normes.md:149-161` liste DataOps/MLOps comme « pas encore implémentées » alors que `dataops/` a 4 workspaces livrés et que les ADR 0062/0067/0068 sont actés (page non touchée depuis 2026-06-07) ; casse la promesse d'exactitude `normes.md:5-10` (esprit ADR 0028). _Volet « vue par culture »_ : `écarter` — cérémonie : `normes.md` est **déjà structurée par discipline** (`## DevSecOps`/`## Qualité`/`## Applications web`/`## Dépendances`/`## Cloud-native`), une table « par culture » dupliquerait la structure et importerait des cultures hors périmètre (GitOps/SRE/FinOps). **Tranché : un edit de page (rafraîchir `normes.md`), pas un ADR ni une table par culture.** (Relié à l'angle mort A5/§5 sur l'honnêteté des cultures revendiquées-vs-écartées, qui lui mérite un traitement léger.)

**M8 — Modèle de menace explicite dans `SECURITY.md`.** `nuancée`.
Déjà-présent + transposable : retenir **uniquement** en version adaptée. **VALEUR écarte la transposition littérale** : la liste cluster est un artefact infra (registry HTTP, RStudio, Ceph non chiffré) adossé à une prémisse d'**isolation réseau** qu'Atlas n'a pas (apps **publiques** sur Internet — `security.md:246,263,267`) ; affirmer une posture de déploiement violerait ADR 0035 R4 + ADR 0026 (le dépôt déciderait à la place du déployeur) ; l'audit interne a **sciemment dé-priorisé** le threat model formel (non listé dans G1-G15 malgré le SAMM Design niveau 1). **Tranché : ne pas copier la section ; replier dans l'existant** — ADR 0001 (table sine die) + section « Points d'attention identifiés (à arbitrer) » de `quality/security.md:286-294`, et expliciter les endpoints publics comme **risques tracés** plutôt qu'une liste de compromis figés.

### Écartées — ne pas faire

| Reco                                                                | Statut                  | Raison décisive (la lentille qui tue)                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **H5 — Manifeste racine (groupe Comprendre)**                       | `écartée` 3/3           | Fonction déjà couverte (`index.mdx` splash, `parcours.md`, `comprendre-le-code.md`) ; le groupe « Comprendre » **n'existe pas** dans la sidebar Atlas ; le récit infra+chiffres volatils heurte 0028/0032/0012/0035.                                                                       |
| **H6 — Formaliser le genre principe-chapeau + rubrique invariants** | `écartée` 2/3           | Genre déjà nommé/appliqué (0035 « règle-chapeau », `parcours.md:23,36`, 0057 chapeau de fait) ; rubrique invariants déjà présente (`Garde-fous.` dans 65/68 ADR, « Invariants à préserver » dans les plans) ; imposer un gabarit fixe = sur-structuration sans contrôle mécanisable.       |
| **M5 — Taxonomie intention vs état (3 classes)**                    | `écartée` 2/3           | La moitié actionnable (auto-détection) est **interdite par 0033** ; les classes réelles d'Atlas (valeur d'instance / capacité dégradable / factice parse-time) **ne mappent pas** « état détectable » ; cluster 0065 ne définit que **2** classes, pas 3.                                  |
| **M7 — En-tête État normé ADR/plan**                                | `écartée` 2/3           | `## Statut` normé déjà sur 68/68 ADR ; l'état des plans vit dans la **colonne Statut centralisée** (`plans/index.md`) plus riche que l'enum à 4 valeurs ; un en-tête par fichier **dupliquerait** sans gate CI.                                                                            |
| **B1 — Séparation temporalité ADR/plan/issue/PR opposable**         | `écartée` 2/3           | La dérive motrice de cluster 0057 (« l'ADR avale le plan », checklists dans ADR immuables) **n'existe pas** : `grep` cases à cocher sur 68 ADR = 0 ; chaînage ADR↔plan déjà en place (`2026-06-11-producteur-researchers.md:5-13`) ; règle opposable = cérémonie + migration de renommage. |
| **B2 — GOVERNANCE.md (mono-mainteneur)**                            | `écartée` 3/3           | Contenu déjà à ~90 % réparti (ADR 0027 bus-factor, CODEOWNERS:9, `workflow.md`, `parametrage-github.md`, CONTRIBUTING) ; cluster lui-même n'a **pas** de GOVERNANCE.md ; nouveau fichier = point de drift.                                                                                 |
| **B3 — Typologie Diátaxis en complément de 0052**                   | `écartée` (nuancée) 2/3 | Cœur « une page = un mode » déjà = R6 de 0052 ; 0059 **désavoue toute mécanisation** (« n'ajoute pas de garde-fou exécutable ») ; 4e axe de classification invisible. _Note : si une page Diátaxis émerge, ce serait via la page « preuves »/orientation (A4), pas un ADR opposable._      |
| **B4 — Matrice de couverture E2E (cluster matrice-catalogue)**      | **renversée**           | Voir A2 ci-dessous : **le besoin EST réel** (deux lentilles sur trois retiennent), mais **pas** sous la forme du catalogue 4-axes infra cluster. Reclassée en angle mort A2.                                                                                                               |

---

## 4. Points qualité du baseline — tranchés proprement

Le baseline avait « perdu » 2 vérifications qualité. Tranché ainsi :

**Point qualité 1 — Mécaniser la cohérence de gouvernance.** Verdict : **ADAPTER, à retenir** (devient A1, §5).
Atlas mécanise la cohérence **documentaire** (`documentation.mjs`, bloquant en CI) mais **pas** la cohérence **de gouvernance** (ADR↔plan↔index par statut, drift `ouvert`⇒issue, fraîcheur). Trou réel. **Adaptation imposée** : pas de portage Python de `check_gouvernance.py` ; (a) la règle drift `ouvert`⇒issue va dans le **schéma Zod** (= M2, plus fort car bloquant au build), (b) le croisement index↔fichier par statut va dans `documentation.mjs` (= noyau utile de M1), (c) **abandonner** le bloc « dépôt en chiffres » régénérable (heurte 0032, série append-only `kpi-history.json`). Un ADR léger cadre le tout.

**Point qualité 2 — Matrice de couverture E2E.** Verdict : **ADAPTER, à retenir** (devient A2, §5).
`coverage-report.mjs` mesure la couverture **unitaire par paquet** — **orthogonal** à une matrice E2E (faux ami). Atlas n'a **aucun catalogue** scénario×chaîne×statut-d'exécution, ni « trous connus », ni miroir testé doc↔specs. Mémoire E2E **réactive** (registre de drifts post-mortem) et non **cartographiée**. **Adaptation imposée** : **abandonner les axes infra** (matériel/topologie/banc Lima — Atlas déploie _sur_ le cluster, ADR 0043) ; garder la **forme** (table chaîne × {unit/intégration/e2e} × a-t-il tourné + trous nommés + miroir testé doc↔`*.spec.ts`/`test_*.py`) sur les chaînes propres : apps Playwright (amarre/sillage), contrats REDCap/Appwrite, **chaîne DataOps E2E** (ingestion → Dagster → dbt → lineage → drift). Absorbe le besoin de M4 (nommer les trous skippables au lieu d'un gate bloquant).

---

## 5. Pratiques nouvelles (angles morts) — recos additionnelles

La critique de complétude a trouvé 6 angles morts + 2 points qualité. Filtrés par les mêmes 3 lentilles :

| #      | Angle mort                                                                                              | Source cluster                            | Statut durci         | Décision                                                                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A1** | Mécaniser cohérence de gouvernance (ADR↔plan↔index par statut + fraîcheur)                              | `check_gouvernance.py` / ADR 0060         | retenir (adapté)     | Étendre `documentation.mjs` + ADR léger. Fusionne M1-noyau + point qualité 1.                                                                                                                                                              |
| **A2** | Cartographier la couverture E2E (matrice scénario×chaîne×statut + trous + miroir testé)                 | `matrice-catalogue.md`/`plan-de-tests.md` | retenir (adapté)     | Page `quality/matrice-e2e.md` + parité doc↔specs. Fusionne B4 + M4 + point qualité 2.                                                                                                                                                      |
| **A3** | Doctrine « corriger le code, pas l'état » (jamais de fix à chaud ; re-prouvé par un run)                | cluster ADR 0046                          | **retenir**          | **Devient critique** dès qu'Atlas pilote des déploiements réels (banc Lima, plan OpenAlex). Absent (grep=0). ADR court.                                                                                                                    |
| **A4** | Garde-fou cible banc↔prod « non confirmée » (équivalent `EXPECT_CLUSTER`, kubeconfig jamais par défaut) | cluster `outils.md`/RUNBOOK / ADR 0053    | **retenir**          | Atlas manipule secrets/`.env` via `access.sh` (contrat 0033) et s'apprête à piloter des déploiements : risque « agir sur la prod en croyant viser le banc » transposable tel quel. Garde-fou + note runbook.                               |
| **A5** | Honnêteté des cultures revendiquées **vs écartées** (nommer ce qu'on n'a PAS)                           | cluster ADR 0062 + `bonnes-pratiques.md`  | **nuancé**           | **Pas** une table « par culture » (cérémonie, cf. M6) ; mais l'**angle honnêteté** (dire SRE-sans-SLO, etc.) peut enrichir la **page vitrine §6** d'une ligne « ce que nous n'avons pas encore ». Léger, pas d'ADR.                        |
| **A6** | Page « preuves » / vitrine d'orientation (« le dépôt ne s'affirme pas, il se trace »)                   | cluster `docs/preuves.md`                 | **retenir (adapté)** | Quick-win vitrine. Consolide les preuves Atlas dispersées (tableau-de-bord, registre-drifts, audits, a11y, RGPD) avec pointeur vers la trace brute, **sans rien recopier**. Voir §6. C'est le bon réceptacle de la part utile de H5/H8/A5. |

Note : l'angle « posture d'adoption / coût de diversité » (qui chevauche H4) est **écarté comme ADR-chapeau** (cf. §3 H4) ; sa seule part utile (nommer le critère) = une phrase dans 0055.

---

## 6. Perspective inverse — forces Atlas à mettre en vitrine

Le baseline regardait surtout ce qu'Atlas devait **importer**. La critique inverse établit qu'**Atlas dépasse cluster sur 4 dimensions** et que son défaut le plus criant est la **sous-exposition** (un seul badge DOI au `README.md:3`). Ces forces sont la **substance** que la page vitrine A6 (et, conditionnellement, la doctrine badge H8) doit exposer — **honnêtement** (ADR 0028 / cluster 0080 : aucun signal non recalculé).

| Force Atlas (vérifiée)                                                                                                         | Cluster équivalent ?                                                      | Geste vitrine                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **a11y WCAG AA mécanisée** — ADR 0038, `config/shared-config/a11y/index.js`, tests `*.a11y.test.ts` axe-core                   | **Non** (réservé/différé, cluster 0080)                                   | Badge a11y **honnête** (adossé au job qui exécute réellement les tests) + signal README                                          |
| **SLA remédiation chiffré + runbook incident** — ADR 0018, `quality/incident-response.md` (P0-P3, CNIL 72 h, post-mortems)     | **Non** (runbooks infra **générés**, pas réponse incident)                | Page « Posture sécurité » consolidée                                                                                             |
| **RGPD applicatif câblé** — ADR 0026/0030, `packages/auth`, `apps/ecrin`, opt-out/registre d'opposition, gate phase 0 bloquant | **Non** (RGPD incident/infra only)                                        | Manifeste RGPD applicatif (« le code permet, le déployeur décide »)                                                              |
| **Drift ML + porte de sécurité** — ADR 0062/0067/0068, bascule `predictive→descriptive` bloquante                              | **Non** (MLflow déployé **vide**, statut Proposed)                        | Page « MLOps niveau 2 » (chaîne entraînement→drift entrée→drift modèle→porte)                                                    |
| **Déterminisme doc à l'octet** — ADR 0028/0032, `scripts/docs/generate-packages-map.mjs --check`                               | **Partiel/différent** (cluster = repro **run-level**, pas byte-level doc) | Encart tableau de bord, **formulé précisément** (« déterminisme documentaire diff-ché », ne pas revendiquer la repro en général) |

**Constat de vitrine décisif** : ici cluster fait mieux _la mise en vitrine_ (doctrine badge ordonnée, Scorecard câblé) alors qu'Atlas a **plus de substance à montrer**. D'où le couplage : la page « preuves » A6 **est** le mouvement vitrine ; la doctrine badge H8 ne se justifie **que** parce qu'elle gouvernerait l'exposition honnête de ces forces. C'est aussi ce qui requalifie **H1 (Scorecard)** non en objectif mais en **conséquence possible** d'une telle vitrine.

---

## 7. Ce qu'il ne faut PAS copier de cluster (durci)

- **Le manifeste long et le récit de domaine** (H5) — chiffres volatils datés, thèse de souveraineté ; heurte 0028/0032/0012/0035.
- **Le bloc « dépôt en chiffres » régénérable en README** (M1) — heurte 0032 (la volatilité va en série append-only `kpi-history.json`, pas en Markdown commité).
- **La taxonomie « intention vs état » à auto-détection** (M5) — interdite par 0033 (Atlas ne sonde pas un cluster vivant).
- **La liste threat-model infra** (M8) — registry/RStudio/Ceph adossés à l'isolation réseau ; Atlas est public, et figer une posture de déploiement viole 0035 R4 / 0026.
- **Les axes infra de la matrice E2E** (matériel/topologie/banc Lima) — Atlas déploie _sur_ le cluster (0043), il ne monte pas de bancs Ceph.
- **L'ADR-chapeau « posture d'adoption »** (H4) et **le genre principe-chapeau formalisé** (H6) — méta-gouvernance auto-référentielle ; les motifs existent déjà de fait.
- **Le portage Python de `check_gouvernance.py`** — l'outillage racine Atlas est Node/`.mjs`.

---

## 8. Liste finale d'ADR à créer (numéros à reconfirmer au commit — dernier ADR = 0068)

Regroupés par PR cohérente. **5 ADR** seulement (le baseline en proposait 8 ; H4, H6, B1, M5, M7 et l'ADR badge isolé sont **retirés**).

**Groupe A — Supply-chain & exactitude (1 ADR + 3 edits sans ADR)**

- **ADR 0069 — Signature et scan des images conteneur (cosign keyless + provenance SLSA + Trivy)** [H2]. Crédite cluster 0088 (mécanisme), cible le **digest image** (pas l'archive source). Priorise Trivy/G2 avant cosign/G1.
- _Sans ADR_ : corriger `SECURITY.md:50` SLSA L3→L2/L0 [H3, cocher #400] ; corriger `README.md:95` + `glossary.md:40` VitePress→Starlight [H9] ; rafraîchir `normes.md:149-161` [M6 volet utile].

**Groupe B — Citabilité & vitrine (1 ADR optionnel + 1 fichier + 1 page)**

- _Sans ADR_ : `CITATION.cff` racine (omettre `version`/`date-released`) [H7].
- **ADR 0070 — Page de preuves / vitrine d'orientation honnête + doctrine de badges admissibles** [A6 + H8 replié + A5]. Consolide les forces §6 (a11y, posture sécurité, RGPD applicatif, MLOps niveau 2, déterminisme doc), pointe vers la trace brute, et pose la règle « badge seulement si dynamique-câblé ou statique-factuel-stable » (aligne 0028/0032). _C'est ici, et seulement ici, que H1/Scorecard pourrait revenir comme badge câblé — non requis._

**Groupe C — Gouvernance & tests mécanisés (1 ADR)**

- **ADR 0071 — Mécaniser la cohérence de gouvernance + cartographier la couverture E2E** [A1 + A2 + M1-noyau + M2 + M4-replié]. Crédite cluster 0060 et `matrice-catalogue.md`/`plan-de-tests.md` (sur le modèle de 0056). Porte : (a) drift `ouvert`⇒`issue` au schéma Zod `content.config.ts` ; (b) `check_index` ADR↔fichier par statut dans `documentation.mjs` ; (c) page `quality/matrice-e2e.md` + parité doc↔specs ; **exclut** le bloc STATS README (0032).

**Groupe D — Robustesse & garde-fous (2 ADR)**

- **ADR 0072 — Property-based testing au dataops Python (Hypothesis)** [M3]. Crédite cluster 0087 ; périmètre 0055 (toolchain Python) ; motivation = robustesse parsers, pas badge Fuzzing.
- **ADR 0073 — Doctrine « corriger le code, pas l'état » + garde-fou de cible banc↔prod** [A3 + A4]. Crédite cluster 0046 + 0053 ; devient opérationnel dès le pilotage de déploiements réels (banc Lima, plan OpenAlex) ; respecte la frontière 0033 (Atlas n'auto-détecte pas le cluster, mais refuse d'agir sur une cible non confirmée côté `access.sh`/`.env`).

**Récapitulatif d'effort** : 5 ADR (0069-0073) + 4 edits sans ADR (SECURITY, README, glossary, normes) + 1 fichier (CITATION.cff). Les 3 corrections factuelles (H3, H9, M6-volet) et CITATION.cff (H7) sont des **quick-wins à coût quasi nul** ; H2/M2/M3 sont les gains structurants ; A6/H8 est le levier de vitrine ; A1/A2/A3/A4 outillent la gouvernance et les déploiements à venir.

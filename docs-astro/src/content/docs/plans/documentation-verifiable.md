---
title: Plan — Documentation vérifiable
---

> Date du plan : 2026-06-01. Issu d'une revue de la documentation publiée
> (les défauts ponctuels recensés sont détaillés en Phase 4). Socle
> décisionnel : [ADR 0013](../decisions/0013-documentation-public-non-expert-fr),
> [ADR 0012](../decisions/0012-neutralisation-framing-institutionnel),
> [ADR 0025](../decisions/0025-documentation-multi-niveaux). Ce plan introduit
> un nouvel ADR 0028 « Documentation vérifiable » (créé en Phase 5).

## Introduction

### Objectif

Faire de la documentation un **miroir contrôlable du code** : on doit pouvoir
**reconstruire la structure générale ET spécifique du monorepo en lisant la
documentation**, et un **expert informatique ou data** doit y trouver assez de
matière pour se faire une idée du code sans tout lire. Le tout doit être
**maintenable** : la documentation ne doit pas pouvoir dériver du code sans que la
CI le signale.

> **Définitions.** _Structure générale_ = les 8 catégories du monorepo, leurs rôles
> et leurs dépendances. _Structure spécifique_ = quel paquet fait quoi, qui dépend de
> qui au niveau paquet, et quels symboles (fonctions, types) chaque paquet expose.
> _Dériver_ = la documentation décrit un état du code qui n'est plus vrai.

### Constat de départ

L'objectif est **déjà atteint pour la structure générale** : la page
[architecture/monorepo.md](../architecture/monorepo) décrit les 8 catégories,
leurs règles et le graphe macro des dépendances. La politique de documentation est
**solide et ne doit pas être dupliquée ni contredite** (trois niveaux Surface /
Profondeur / Inline, français pour public non-expert, ton factuel — voir
[documentation.md](../quality/documentation)).

Mais trois manques empêchent d'atteindre l'objectif complet :

1. **La structure spécifique n'est pas lisible** : aucune page ne dit _quel paquet
   fait quoi_ ni _qui dépend de qui au niveau paquet_. Pour comprendre `ecrin`, le
   lecteur doit deviner qu'il faut lire `auth`, `baas`, `sveltekit-handler`,
   `crf-client`.
2. **Rien ne vérifie la documentation**, alors que tout le reste est audité
   (`scripts/audit/*`). La documentation peut donc dériver sans alerte.
3. **14 défauts ponctuels** relevés dans les notes d'audit : termes non définis
   (Git, Docker, cache, SLA, DevSecOps, fork, lint, typecheck), page sécurité mal
   structurée, renvois obsolètes, comportement Effect non documenté.

### Principe directeur (à acter en ADR 0028)

Ce qui est **factuel et dérivable du code** (carte des paquets, dépendances
inter-paquets, index des symboles exportés) est **généré** depuis le code et vérifié
à jour en CI. Ce qui est **rédigé** (README, pages `docs/`, ADR) reste manuel mais
est **audité** (présence, structure, liens, cohérence avec `package.json`). On ne
génère jamais de prose ; on n'audite jamais la qualité rédactionnelle. Conséquence
centrale : **modifier le code sans mettre à jour la documentation casse la CI**.

Ce principe **étend** le socle existant (ADR 0013 / 0012 / 0025) avec la dimension
_vérifiable / anti-dérive_ ; il ne le remplace pas.

---

## Phase 1 — Génération de la structure (factuel, dérivable du code)

**Objectif.** Produire depuis le code les artefacts factuels, et garantir qu'ils ne
peuvent pas dériver.

### Étape 1.1 — Factoriser l'indexation du workspace

- **But.** Extraire de `scripts/audit/workspace-structure.mjs` un module réutilisable
  `scripts/audit/lib/workspace-index.mjs` : `ROOTS`, `buildWorkspaceIndex()`
  (la `Map<nom, {root, dir, packageJson}>`), `internalDepsOf()`,
  `buildDependencyGraph()`, `detectCycles()`.
- **Invariant.** `workspace-structure.mjs` importe ce module ; comportement
  inchangé, couvert par ses tests existants + tests du module extrait.
- **Pourquoi en premier.** Tout le reste s'appuie dessus ; c'est un refactor pur, à
  risque quasi nul.

### Étape 1.2 — Générer la carte des paquets

- **But.** `scripts/docs/generate-packages-map.mjs` produit
  `docs/architecture/packages.md` (fichier **tracké/commité**, condition du
  contrôle de fraîcheur). Pour chaque paquet : nom, catégorie, publiable ou privé,
  rôle (depuis `package.json.description`, sinon le premier paragraphe du README,
  sinon « non documenté »), dépendances internes consommées, **paquets qui le
  consomment** (reverse-deps), lien vers son README. Plus un **graphe Mermaid
  inter-paquets** avec un sous-graphe par catégorie (43 paquets : un graphe
  monolithique serait illisible).
- **Déterminisme.** Tri stable, pas d'horodatage, style identique à Prettier (sinon
  le hook de formatage réécrit le fichier et le contrôle de fraîcheur diverge). Le
  corps généré est encadré par des marqueurs `<!-- AUTO-GENERATED START/END -->`
  avec une courte introduction rédigée en français au-dessus.
- **Validation.** `pnpm docs:build` passe (Mermaid rend, aucun lien mort) ;
  `prettier --check docs/architecture/packages.md` ne réécrit rien.

### Étape 1.3 — Brancher l'index API (TypeDoc)

- **But.** Donner à l'expert la structure **spécifique fine** (symboles et signatures
  exportés par paquet). TypeDoc est déjà configuré dans `package.json`
  (`typedocOptions`, sortie `docs/api/`, plugin markdown) mais non branché.
- **Cantonnement.** L'index API vit dans une section « Référence API » de la
  navigation, **balisée explicitement comme générée, en anglais, de niveau Inline** —
  pour ne pas créer de dissonance avec la documentation rédigée en français
  (ADR 0013). C'est une **exception assumée** documentée dans l'ADR 0028 : l'anglais
  est toléré parce que ce contenu est _dérivé du code_, pas _rédigé_.
- **Anti-dérive.** Régénération à chaque déploiement de la documentation ; un
  contrôle léger vérifie que les `entryPoints` de `typedocOptions` correspondent aux
  paquets publiables réels (un nouveau paquet absent de l'API échoue). `docs/api/`
  reste hors suivi Git (volumineux) ; sa fraîcheur tient à la régénération CI.

### Étape 1.4 — Contrôle de fraîcheur de la carte (anti-dérive)

- **But.** Empêcher la carte des paquets de dériver, sur le modèle de
  `check-lockfile`.
- **Mécanisme.** `pnpm docs:generate` écrit la carte ; `pnpm docs:generate:check`
  (mode `--check`) la régénère en mémoire et compare au disque sans écrire — sortie
  d'erreur si divergence, avec le message « lance `pnpm docs:generate` et commite ».
- **Intégration.** Hook lefthook `pre-push` (déclenché si un `package.json` ou un
  README change) ; étape dans le job Audit de la CI.
- **Done criteria.** Modifier une dépendance inter-paquet sans régénérer la carte
  fait échouer `docs:generate:check`.

---

## Phase 2 — Audit de la documentation rédigée

**Objectif.** Vérifier ce qui est rédigé sans en juger le fond, sur le modèle de
`audit:structure`.

### Étape 2.1 — Script `scripts/audit/documentation.mjs`

- **But.** Calqué sur `scripts/audit/coverage-report.mjs` (fonctions pures
  exportées + `main()` gardé). Sévérité pilotée par un argument (comme
  `coverage:report 40`) pour promouvoir des avertissements en blocages plus tard
  sans réécrire le code.
- **Règles bloquantes.** README présent (paquet publiable) ; titre H1 ; paragraphe
  de description ; titre cohérent avec `package.json.name` ; chaque `bin` et chaque
  sous-chemin `exports` mentionné dans le README ; liens relatifs internes valides
  (liste blanche pour `docs/api/**` généré) ; ADR référencé existant ; carte des
  paquets à jour ; **aucune page `docs/` orpheline** (toute page doit figurer dans
  la navigation). Cette dernière règle corrige le cas signalé :
  [documentation.md](../quality/documentation) est actuellement orpheline.
- **Règles en avertissement** (mesurent l'écart, promues plus tard) : `description`
  dans `package.json` ; tous les symboles exportés mentionnés au README ; lien
  cliquable vers `TODO.md` (supprimé) ; ancre de glossaire résoluble ; bloc
  Installation/Usage dans un README publiable.
- **Tests.** `scripts/audit/documentation.test.mjs` (node:test, fixtures en
  mémoire) — couvert automatiquement par le hook `test-scripts`.

### Étape 2.2 — Intégration

- `package.json` : `audit:docs`, et l'ajouter à `ci:audit`.
- `lefthook.yml` (pre-push) + job Audit de `ci.yml` : `audit:docs` et
  `docs:generate:check`.

---

## Phase 3 — Parcours expert et flux de données

**Objectif.** Permettre à un expert d'entrer dans le code par le bon endroit.

### Étape 3.1 — Page « Comprendre le code »

- **But.** `docs/architecture/comprendre-le-code.md` (niveau Profondeur) : point
  d'entrée expert. Renvoie vers la carte des paquets et donne des **parcours
  thématiques** (« pour l'authentification : `auth` + `baas` +
  `sveltekit-handler` » ; « pour le CRF : `crf-core` + `crf-client` +
  `crf-fixtures` + `services/crf` »).

### Étape 3.2 — Enrichir le flux de données

- **But.** [data-flow.md](../architecture/data-flow) : décrire le parcours d'une
  donnée de bout en bout (source → `crf-client` → `crf-core` → `services/crf` →
  app), les **contrats** (Effect Schema, brands de `crf-core`,
  `crf-project-template`, `crf-fixtures`), et où vivent les invariants. Vise
  l'expert _data_.

---

## Phase 4 — Correction des 14 défauts ponctuels

**Objectif.** Traiter les défauts des notes d'audit. Chacun est cartographié
(fichier, emplacement).

- **[ci-pipeline.md](../quality/ci-pipeline)** : définir _lint_, _typecheck_,
  _test_, _audit_ (et le détail par sous-commande).
- **[tests.md](../quality/tests)** : introduire Docker, Appwrite, REDCap avant le
  tableau, avec renvoi au glossaire.
- **[code-style.md](../quality/code-style)** : définir _Git_.
- **[hooks.md](../quality/hooks)** : définir _commit_, _push_, _pull request_,
  _hook_.
- **[security.md](../quality/security)** : retirer le bloc « Pages d'origine » ;
  ajouter une section **DevSecOps** ; clarifier le cheminement « Audit récurrent →
  Procédure d'urgence » ; définir **SLA**.
- **[workflow.md](../collaboration/workflow)** : ajouter une section **fork** pour
  les contributeurs externes sans accès en écriture.
- **[ADR 0005](../decisions/0005-effect-pour-la-pf)** : documenter le fait de
  **retarder `Effect.runSync` / `runPromise` aux consommateurs finaux** (apps, CLI,
  services) — pourquoi et comment. Recoupe le contrat d'exécution du parcours data.
- **[ADR 0019](../decisions/0019-derogations-workspace-audit)** : note explicative
  renvoyant les mentions « Phase X.Y » au plan de résorption (références historiques
  conservées).
- **[glossary.md](../glossary)** : ajouter Git, fork, Docker, cache, lint,
  typecheck, DevSecOps, SLA.
- **[config.ts](../.vitepress/config.ts)** : ajouter **Sécurité** à la navigation
  horizontale ; ajouter à la barre latérale **Documentation**, la carte des paquets,
  « Comprendre le code », la Référence API, et les ADR 0026 / 0027 / 0028.

---

## Phase 5 — ADR 0028 et page d'accueil

**Objectif.** Acter le principe directeur et offrir une table de contrôle.

### Étape 5.1 — ADR 0028 « Documentation vérifiable »

- **But.** `docs/decisions/0028-documentation-verifiable.md` : acte le principe,
  référence ADR 0013 / 0012 / 0025 comme socle, documente les choix (carte générée,
  audit, TypeDoc en zone anglaise assumée, anti-dérive) et les **dettes connues**
  (les README sont aujourd'hui en anglais, en tension avec ADR 0013 — non résolu par
  l'audit, documenté). Rédigé **en dernier** : il décrit ce qui a réellement été
  construit. Ajouté à l'index ADR et à la navigation.

### Étape 5.2 — Page d'accueil en table de contrôle

- **But.** [index.md](../index) repensée avec deux entrées claires : « Je
  découvre » (néophyte → niveau Surface) et « Je veux lire le code » (expert → carte
  des paquets + « Comprendre le code » + Référence API).

---

## Ordre d'exécution

Du moins risqué au plus risqué : 1.1 (refactor) → 1.2 (carte) → 1.4 (contrôle de
fraîcheur) → Phase 4 (défauts ponctuels, indépendants) → Phase 3 (parcours expert) →
1.3 (TypeDoc) → 2.1 (audit, bloquant) → 2.2 (intégration) → avertissements → Phase 5
(ADR + accueil).

Regroupement possible en quelques PR thématiques (génération + audit / corrections
rédactionnelles / ADR + navigation), chacune en _auto-merge squash_.

---

## Risques et points de vigilance

- **Déterminisme carte ↔ Prettier** : le générateur doit produire exactement le
  style Prettier, sinon le contrôle de fraîcheur boucle.
- **TypeDoc en anglais vs ADR 0013** : cantonné à une zone « Référence API » balisée,
  exception assumée dans l'ADR 0028. Ne pas imposer le français aux README (≈ 36
  paquets sont en anglais — dette connue, non résolue par l'audit).
- **Analyse de `config.ts` en texte** (règle anti-orphelines) : casse si la
  navigation devient programmatique. Acceptable aujourd'hui (navigation statique).
- **Liens vers `docs/api/`** (hors suivi Git) dans certains README : liste blanche
  obligatoire dans le vérificateur de liens, sinon faux positifs massifs.

### Sur-ingénierie à éviter

- Ne pas générer les README (niveau Surface rédigé — générer perd la valeur
  pédagogique). On audite, on ne génère pas la prose.
- Ne pas analyser l'AST TypeScript pour les exports — des expressions régulières
  suffisent à vérifier « le symbole est-il mentionné ».
- Ne pas tenter de vérifier la justesse sémantique de la prose (impossible
  automatiquement).

---

## Critères de réussite

- **Expert info/data** : depuis la page d'accueil → « lire le code », il atteint la
  carte des paquets, un parcours thématique, le flux de données et ses contrats, et
  la Référence API. _Test concret_ : « pour comprendre `ecrin`, que dois-je lire ? »
  a une réponse lisible dans la documentation sans ouvrir le code.
- **Anti-dérive** : changer une dépendance inter-paquet sans régénérer la carte fait
  échouer `docs:generate:check` ; ajouter un export public sans le mentionner au
  README est signalé par `audit:docs`.
- **Chaîne verte** : `docs:build`, `audit:docs`, `docs:generate:check`,
  `test:scripts`, `audit:structure`.
- **14 défauts** : tous les termes signalés sont définis ; la page sécurité est
  restructurée ; le fork et le comportement `Effect.runSync` sont documentés ;
  Sécurité figure dans la navigation ; `documentation.md` n'est plus orpheline.
- **Conformité** : aucune contradiction avec ADR 0013 / 0012 / 0025 ; l'ADR 0028 les
  référence comme socle.

---
title: "Faisabilité OpenSSF Best Practices : silver & gold (2026-06-30)"
---

> Date : 2026-06-30. Type : passage de **faisabilité** des paliers supérieurs du
> badge OpenSSF Best Practices (silver, gold) à partir du **passing** visé (projet
> [13440](https://www.bestpractices.dev/projects/13440)). Méthode : critères
> officiels récupérés en direct (47 MUST silver, 21 MUST gold) croisés avec
> l'état **réel** d'atlas, vérification adversariale.

> **Verdict.** **Gold hors d'atteinte** (mono-mainteneur — 3 MUST exigent une 2ᵉ
> personne) ; **silver atteignable avec effort** (aucun MUST n'exige une 2ᵉ
> personne, mais un vrai chantier de couverture). **Décision** : viser silver
> _après_ avoir fermé honnêtement la couverture et la continuité d'accès ; **ne
> pas viser gold**, et le tracer plutôt que gonfler des cases. La décision est
> formalisée en [ADR 0086](/atlas/decisions/0086-posture-paliers-best-practices/).

## Pourquoi ce passage

Une fois le `passing` en place (answer-sheet
[2026-06-29](/atlas/audit/2026-06-29-best-practices-badge-answer-sheet/)), la
question se pose : viser **silver** puis **gold** ? On l'instruit **avant** toute
action, fidèle à la doctrine d'honnêteté des signaux ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/),
[ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/) : n'afficher/poursuivre
que ce qui mesure du vrai). Atlas **diffère** du dépôt jumeau `cluster` (vrai
build TypeScript, 316 fichiers de test, vitest) : la conclusion est instruite sur
l'**état réel d'atlas**, pas par analogie.

## Gold — hors d'atteinte (3 MUST irréductibles)

Gold exige, en **MUST**, des critères qui supposent une **seconde personne** —
incompatibles avec un dépôt **mono-mainteneur assumé** (bus-factor = 1) :

| Critère gold                | Pourquoi bloqué                                                              |
| --------------------------- | ---------------------------------------------------------------------------- |
| `bus_factor` ≥ 2            | bus-factor = 1, mono-mainteneur assumé                                       |
| `contributors_unassociated` | un seul contributeur significatif, même organisation                         |
| `two_person_review` ≥ 50 %  | 0 approbateur requis sur `main` ; un mainteneur unique ne peut s'auto-relire |

Aucune action **solo** ne débloque ces trois MUST : il faudrait un **second
mainteneur durable et indépendant** — donc changer la nature du projet. Gold est
**exclu**, et c'est un **choix tracé**, pas un oubli. Les cocher reviendrait à
revendiquer une relecture à deux et un facteur de bus qui n'existent pas — contraire
à l'aveu bus-factor = 1 et à la doctrine d'honnêteté.

D'autres MUST gold sont **Partial** (effort L sans valeur nette ici) :
`test_statement_coverage90`, `test_branch_coverage80`, `build_reproducible`
(répétabilité forte mais pas de bit-à-bit vérifié), `security_review` humaine
documentée (champion sécurité vacant, [ADR 0027](/atlas/decisions/0027-security-champion/)),
`copyright_per_file` / `license_per_file` (lourd, en tension avec la neutralité).
Un seul MUST gold est **closable en un clic** : `require_2FA` au niveau de
l'organisation (réglage, voir quick-wins) — utile en soi, insuffisant pour le palier.

## Silver — atteignable avec effort (aucun MUST « 2 personnes »)

Bilan : la grande majorité des 47 MUST silver sont **déjà Met** (build,
Conventional Commits, SAST multiple, Dependabot, provenance OIDC npm, images
cosign keyless, headers, dépendances épinglées). Restent **deux chantiers réels**
et quelques compléments S/M :

1. **`test_statement_coverage80`** — le point dur, et il **n'est pas acquis** :
   la couverture est mesurée, mais le **gate CI agrégé est à 40**
   (`pnpm coverage:report 40`, [ci.yml:157](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/ci.yml#L157)),
   et plusieurs paquets abaissent leur seuil. La couverture statement ≥ 80 % n'est
   donc **ni atteinte ni imposée** à l'échelle du projet. Closable solo, effort
   **L** — et dans le **bon ordre** : résorber la dette de tests **puis** remonter
   le gate à 80, **jamais l'inverse** (remonter le chiffre avant la dette serait un
   coverage trompeur, interdit par [ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).
2. **`access_continuity`** — à traiter **honnêtement** : exige un 2ᵉ admin
   d'organisation réel **et** un plan de succession, pas une case cochée au motif
   que le dépôt vit sur l'org `univ-lehavre`. Tant que le bus-factor reste 1, ce
   critère est à la limite du déclaratif.

Compléments S/M solo-closables : `governance` (GOVERNANCE.md), `documentation_roadmap`
(ROADMAP.md), `signed_releases` complet (signer les tags de version + sommes par
asset), politique de non-régression explicite (`regression_tests_added50`).

## Cases qu'il serait malhonnête de cocher en l'état

La doctrine d'honnêteté ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/),
[ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/)) interdit de cocher :

- `two_person_review`, `bus_factor`, `contributors_unassociated` — revendiquer une
  seconde personne inexistante ;
- `test_statement_coverage80/90`, `test_branch_coverage80` — afficher 80/90 alors
  que le gate agrégé est à 40 ; **ne cocher qu'après** que la couverture réelle ET
  le gate atteignent le seuil ;
- `access_continuity` — sans 2ᵉ admin ni plan de succession ;
- `regression_tests_added50` — non mesuré (aucun check ne lie un correctif à un
  test de non-régression) ;
- `security_review` (gold) — sans revue de sécurité **humaine** documentée.

## Décision

> **On vise `silver`, pas `gold`.** Gold est **hors d'atteinte** tant qu'atlas
> reste mono-mainteneur (3 MUST exigeant une 2ᵉ personne). Silver est
> **atteignable** mais conditionné à la fermeture **honnête** de la couverture
> (`test_statement_coverage80`) et de la continuité d'accès (`access_continuity`) ;
> on ne le revendique **pas** par cases déclaratives. Voir
> [ADR 0086](/atlas/decisions/0086-posture-paliers-best-practices/).

**Capitalisation à valeur intrinsèque.** Plusieurs « quick-wins silver » valent
**indépendamment du badge** et sont réalisés au fil de l'eau (cette PR en livre
les premiers) :

- [`GOVERNANCE.md`](https://github.com/univ-lehavre/atlas/blob/main/GOVERNANCE.md) —
  modèle de décision, qui décide, statut mono-mainteneur assumé.
- [`ROADMAP.md`](https://github.com/univ-lehavre/atlas/blob/main/ROADMAP.md) —
  direction ≥ 12 mois reliant `plans/` et milestones.
- Phrase-politique de tests explicite dans `CONTRIBUTING.md`.
- (Réglages, à la main du mainteneur) activer **2FA** au niveau de l'org ;
  nommer un **2ᵉ admin** d'org + document de succession ; **signer les tags** de
  version.

**À ne pas faire** : afficher un coverage chiffré non atteint (interdit ADR 0070),
en-têtes copyright/licence par fichier (lourd, en tension avec la neutralité), tout
critère « 2 personnes » (impossible à bus-factor = 1).

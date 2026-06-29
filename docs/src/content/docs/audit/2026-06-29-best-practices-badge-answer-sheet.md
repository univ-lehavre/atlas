---
title: "OpenSSF Best Practices Badge — feuille de réponses « passing » (2026-06-29)"
---

> Date : 2026-06-29. Type : feuille de réponses opérationnelle pour remplir le
> questionnaire **passing** du badge sur [bestpractices.dev](https://www.bestpractices.dev/)
> (BadgeApp). Méthode : chaque ligne cite une **preuve réelle** vérifiée dans le
> dépôt — discipline d'honnêteté des signaux
> ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/),
> [ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/)). Aucun critère n'est
> coché « pour le badge ».

> **Verdict.** `passing` **atteignable — 0 Unmet.** Les 4 manques initiaux sont
> fermés : 2 en code (encart anglais dans README/CONTRIBUTING/SECURITY ;
> `.github/ISSUE_TEMPLATE/`) et 2 par réglage GitHub, **faits le 2026-06-29**
> (description du dépôt enrichie ; **Discussions activées**, `has_discussions: true`).
> Bilan : **~52 Met, ~12 N/A légitimes, 0 Unmet**. Les critères release/test/CI
> sont **plus forts** qu'au dépôt jumeau `cluster` (vrai build TS, 316 fichiers de
> test, provenance OIDC npm).

## Comment s'en servir

1. Créer le projet sur <https://www.bestpractices.dev/> (connexion GitHub, dépôt
   `univ-lehavre/atlas`). Le BadgeApp **auto-remplit** beaucoup de critères via
   l'API GitHub.
2. Pour chaque critère ci-dessous : recopier la réponse (Met / N/A / Unmet) et
   coller la justification + l'URL de preuve. Toute mention `fichier` se traduit
   en URL par la base `https://github.com/univ-lehavre/atlas/blob/main/` + le
   chemin.
3. Les critères **N/A** sont légitimement non applicables (pas de cryptographie
   maison) — le badge les compte comme satisfaits dès lors que la justification
   est fournie.
4. Tous les critères sont **Met ou N/A** : recopier directement les réponses
   ci-dessous dans le BadgeApp pour obtenir le badge `passing`.

## URL prêtes à coller

Le BadgeApp ne réclame une **URL** que pour un sous-ensemble de critères (champ
`*_url` obligatoire ou attendu). Voici ces seuls critères, avec le lien réel
vérifié à coller — les autres critères se cochent sans URL.

| Critère                        | URL à coller                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `contribution`                 | <https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md>                |
| `contribution_requirements`    | <https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md>                |
| `documentation_basics`         | <https://univ-lehavre.github.io/atlas/>                                          |
| `release_notes`                | <https://github.com/univ-lehavre/atlas/releases>                                 |
| `documentation_interface`      | <https://univ-lehavre.github.io/atlas/decisions/0033-contrat-interface-cluster/> |
| `vulnerability_report_process` | <https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md>                    |
| `report_process`               | <https://github.com/univ-lehavre/atlas/tree/main/.github/ISSUE_TEMPLATE>         |
| `report_archive`               | <https://github.com/univ-lehavre/atlas/issues?q=is%3Aissue>                      |
| `static_analysis`              | <https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/codeql.yml>   |
| `test_policy`                  | <https://univ-lehavre.github.io/atlas/quality/tests/>                            |

## Basics

| Critère                     | Réponse | Justification / preuve                                                                                                                                                                                 |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `description_good`          | Met     | Description GitHub : « Monorepo généraliste : apps web, bibliothèques, services, CLIs et chaîne DataOps Python, sous une chaîne de qualité commune » + README détaillé.                                |
| `interact`                  | Met     | README « Démarrage rapide », `CONTRIBUTING.md`, GitHub Discussions activées.                                                                                                                           |
| `contribution`              | Met     | `CONTRIBUTING.md` : branches, Conventional Commits, hooks, merge commit ([ADR 0053](/atlas/decisions/0053-strategie-merge-commit-main/)).                                                              |
| `contribution_requirements` | Met     | Exigences d'acceptation dans `CONTRIBUTING.md` (sujet minuscule, scope-enum, hooks pre-push, merge commit propre). **URL** : <https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md>         |
| `floss_license`             | Met     | `LICENSE` = MIT (FLOSS).                                                                                                                                                                               |
| `floss_license_osi`         | Met     | MIT = OSI-approved.                                                                                                                                                                                    |
| `license_location`          | Met     | `LICENSE` à la racine.                                                                                                                                                                                 |
| `documentation_basics`      | Met     | Site doc Astro Starlight ([univ-lehavre.github.io/atlas](https://univ-lehavre.github.io/atlas/)) : architecture, qualité, collaboration, glossaire.                                                    |
| `documentation_interface`   | Met     | Contrat d'interface `atlas`↔`cluster` ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) + doc d'architecture du monorepo.                                                                 |
| `sites_https`               | Met     | Site doc HTTPS (GitHub Pages) ; dépôt GitHub HTTPS. **URL** : <https://univ-lehavre.github.io/atlas/>                                                                                                  |
| `discussion`                | Met     | **GitHub Discussions activées** (`has_discussions: true`) + issue tracker public searchable.                                                                                                           |
| `english`                   | Met     | Encart « English summary » / « In English » dans `README.md`, `CONTRIBUTING.md` et `SECURITY.md` : issues, PR et rapports de sécurité **en anglais acceptés**. Doc de fond en FR (langue de l'équipe). |
| `maintained`                | Met     | Activité quotidienne (PR/merges réguliers, releases par paquet, issues traitées).                                                                                                                      |

## Change Control

| Critère               | Réponse | Justification / preuve                                                                                                                            |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo_public`         | Met     | Dépôt public versionné git.                                                                                                                       |
| `repo_track`          | Met     | Git suit changements, auteurs, horodatages.                                                                                                       |
| `repo_interim`        | Met     | Branches PR + **merge commit** ([ADR 0053](/atlas/decisions/0053-strategie-merge-commit-main/)) préservent l'intermédiaire.                       |
| `repo_distributed`    | Met     | Git (distribué).                                                                                                                                  |
| `version_unique`      | Met     | Tags SemVer uniques par paquet (`@univ-lehavre/atlas-…@X.Y.Z`).                                                                                   |
| `version_semver`      | Met     | SemVer dérivé des commits par **Changesets**.                                                                                                     |
| `version_tags`        | Met     | Releases identifiées par tags ; GitHub Releases par paquet.                                                                                       |
| `release_notes`       | Met     | `CHANGELOG.md` (Keep a Changelog) par paquet, généré par Changesets ; GitHub Releases. **URL** : <https://github.com/univ-lehavre/atlas/releases> |
| `release_notes_vulns` | Met     | Pas de CVE publique propre corrigée à ce jour ; les correctifs de sécurité passent en `fix:` au changelog.                                        |

## Reporting

| Critère                         | Réponse | Justification / preuve                                                                                                                                                                                |
| ------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report_process`                | Met     | `.github/ISSUE_TEMPLATE/` : formulaires `bug_report.yml`, `feature_request.yml` + `config.yml` (lien sécurité vers signalement privé).                                                                |
| `report_tracker`                | Met     | GitHub Issues utilisé activement (milestones `Transverse — …`).                                                                                                                                       |
| `report_responses`              | Met     | Mainteneur réactif (issues ouvertes/fermées sous quelques jours).                                                                                                                                     |
| `enhancement_responses`         | Met     | Issues `enhancement`/`tech-debt` ouvertes depuis les audits ([ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) R-findings).                                                      |
| `report_archive`                | Met     | Archive publique et cherchable des signalements et réponses : issues GitHub ouvertes **et** fermées, indexées par la recherche. **URL** : <https://github.com/univ-lehavre/atlas/issues?q=is%3Aissue> |
| `vulnerability_report_process`  | Met     | `SECURITY.md` publié, lié au repo. **URL** : <https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md>                                                                                            |
| `vulnerability_report_private`  | Met     | GitHub **Private Vulnerability Reporting** documenté dans `SECURITY.md` (advisories privées).                                                                                                         |
| `vulnerability_report_response` | Met     | Délais cibles documentés (`SECURITY.md` : évaluation initiale 7 jours).                                                                                                                               |

## Quality

| Critère                       | Réponse | Justification / preuve                                                                                                                                                                              |
| ----------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`                       | Met     | Vrai build : Turborepo (`pnpm build`) côté TS ; uv côté Python ([dataops/](/atlas/decisions/0055-categorie-dataops-python/)).                                                                       |
| `build_common_tools`          | Met     | pnpm, turbo, vite, tsc, uv (outils standards).                                                                                                                                                      |
| `build_floss_tools`           | Met     | Toute la chaîne est FLOSS.                                                                                                                                                                          |
| `test`                        | Met     | Suite FLOSS : **vitest** + **Playwright** (e2e) côté TS, **pytest + Hypothesis** côté Python ([ADR 0072](/atlas/decisions/0072-property-based-testing-dataops-python/)).                            |
| `test_invocation`             | Met     | `pnpm test` (vitest), `uv run pytest` (dataops). Documenté dans le README.                                                                                                                          |
| `test_most`                   | Met     | Large couverture : **316 fichiers de test** + scénarios e2e Playwright + property-based.                                                                                                            |
| `test_continuous_integration` | Met     | CI GitHub Actions sur chaque push/PR (`ci.yml`, `e2e.yml`).                                                                                                                                         |
| `test_policy`                 | Met     | Pyramide de tests documentée ([docs/quality/tests](https://univ-lehavre.github.io/atlas/quality/tests/)).                                                                                           |
| `tests_are_added`             | Met     | Tests ajoutés avec les features (property-based [ADR 0072](/atlas/decisions/0072-property-based-testing-dataops-python/), a11y [ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/)). |
| `tests_documented_added`      | Met     | Page tests + section Tests du `CONTRIBUTING.md`.                                                                                                                                                    |
| `warnings`                    | Met     | Linters stricts en CI : ESLint, Prettier `--check`, tsc strict, ruff, svelte-check.                                                                                                                 |
| `warnings_fixed`              | Met     | Checks bloquants requis sur `main` + `enforce_admins` actif ([ADR 0016](/atlas/decisions/0016-branch-protection-main/)).                                                                            |
| `warnings_strict`             | Met     | TypeScript strict, ESLint règles sécu/fonctionnelles, `jscpd ≤ 5 %`, CodeQL `security-and-quality`.                                                                                                 |

## Security

| Critère                          | Réponse | Justification / preuve                                                                                                                                   |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `know_secure_design`             | Met     | Modèle de menace + compromis tracés en ADR ; SLA de remédiation ([ADR 0018](/atlas/decisions/0018-sla-remediation-findings/)), runbook d'incident.       |
| `know_common_errors`             | Met     | gitleaks (secrets), CodeQL (SAST), Semgrep, OWASP ZAP (DAST), Scorecard.                                                                                 |
| `crypto_published`               | N/A     | Pas de crypto maison ; TLS/auth délégués aux plateformes (Appwrite, GHCR).                                                                               |
| `crypto_call`                    | N/A     | Aucun algorithme crypto implémenté dans le code applicatif.                                                                                              |
| `crypto_floss`                   | N/A     | Pas de fonctionnalité crypto propre.                                                                                                                     |
| `crypto_keylength`               | N/A     | Pas de génération de clés par le projet.                                                                                                                 |
| `crypto_working`                 | N/A     | Aucun algorithme crypto implémenté.                                                                                                                      |
| `crypto_weaknesses`              | N/A     | Idem.                                                                                                                                                    |
| `crypto_pfs`                     | N/A     | Pas de négociation de clé maison.                                                                                                                        |
| `crypto_password_storage`        | N/A     | Pas de stockage de mot de passe applicatif (auth déléguée à Appwrite).                                                                                   |
| `crypto_random`                  | N/A     | Pas de génération de clés/nonces par le projet.                                                                                                          |
| `delivery_mitm`                  | Met     | Git/HTTPS + **actions épinglées par SHA** + **images de base épinglées par digest** ([ADR 0084](/atlas/decisions/0084-pinning-images-base-par-digest/)). |
| `delivery_unsigned`              | Met     | Téléchargements via HTTPS ; dépendances verrouillées (`pnpm-lock.yaml`, `uv.lock`).                                                                      |
| `vulnerabilities_fixed_60_days`  | Met     | Dependabot (npm/pip/actions/docker) + audit npm bloquant (`moderate`) + Scorecard.                                                                       |
| `vulnerabilities_critical_fixed` | Met     | Dependabot + délais `SECURITY.md` (Critical 7 j, [ADR 0018](/atlas/decisions/0018-sla-remediation-findings/)).                                           |
| `no_leaked_credentials`          | Met     | gitleaks à chaque commit (pre-commit) et en CI ; valeurs réelles en config locale gitignorée.                                                            |

## Analysis

| Critère                                  | Réponse | Justification / preuve                                                                                                                                 |
| ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `static_analysis`                        | Met     | **CodeQL** (`codeql.yml`) + **Semgrep** + ESLint sécu + ruff. **URL** : <https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/codeql.yml> |
| `static_analysis_common_vulnerabilities` | Met     | CodeQL `security-extended,security-and-quality` + Semgrep + gitleaks + dependency-review.                                                              |
| `static_analysis_fixed`                  | Met     | Alertes CodeQL/Semgrep triées (onglet Security) ; SLA de remédiation ([ADR 0018](/atlas/decisions/0018-sla-remediation-findings/)).                    |
| `static_analysis_often`                  | Met     | À chaque push/PR + cron hebdo (CodeQL, Scorecard).                                                                                                     |
| `dynamic_analysis`                       | Met     | **OWASP ZAP** baseline (DAST) sur les apps déployées + e2e Playwright.                                                                                 |
| `dynamic_analysis_unsafe`                | N/A     | Pas de langage memory-unsafe (TypeScript/Python).                                                                                                      |
| `dynamic_analysis_enable_assertions`     | Met     | Assertions des suites e2e/intégration ; gates de qualité bloquants en CI.                                                                              |
| `dynamic_analysis_fixed`                 | Met     | Écarts e2e indexés (registre des drifts) puis corrigés.                                                                                                |

## Synthèse

**Met : ~52 · N/A : ~12 · Unmet : 0.** Le badge `passing` ignore les N/A
justifiés : **tous les critères sont satisfaits**, plus aucune action requise.

Les 4 manques initiaux ont été fermés :

- ✅ **`english`** — encart « English summary » / « In English » dans
  `README.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- ✅ **`report_process`** — `.github/ISSUE_TEMPLATE/` (`bug_report.yml`,
  `feature_request.yml`, `config.yml`).
- ✅ **`description_good`** — description GitHub du dépôt enrichie (2026-06-29).
- ✅ **`discussion`** — GitHub Discussions activées (2026-06-29).

Prochaine étape : créer le projet sur [bestpractices.dev](https://www.bestpractices.dev/)
et **recopier les réponses ci-dessus** pour obtenir le badge `passing`.

> **Au-delà de passing** (pistes silver/gold, déjà partiellement acquises) :
> `enforce_admins` actif, CodeQL + Semgrep + ZAP + gitleaks + Scorecard,
> provenance OIDC npm sur chaque publish ([ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)),
> actions épinglées par SHA et images par digest ([ADR 0084](/atlas/decisions/0084-pinning-images-base-par-digest/)),
> DOI Zenodo. Manques pour silver/gold : `CITATION.cff` (le DOI existe mais pas
> le fichier), `CODEOWNERS` **imposé** (existe mais non requis en protection,
> bloqué par le bus-factor = 1, cf. [ADR 0016](/atlas/decisions/0016-branch-protection-main/)),
> signature cosign/SLSA des images.

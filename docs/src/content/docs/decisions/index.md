---
title: Architecture Decision Records (ADR)
---

Trace **pourquoi** chaque choix structurant du dépôt — pas le _comment_
(couvert par la documentation thématique sous [`docs/architecture/`](/atlas/architecture/monorepo/),
[`docs/quality/`](/atlas/quality/ci-pipeline/) et
[`docs/collaboration/`](/atlas/collaboration/workflow/)), mais le contexte,
l'alternative écartée et les conséquences assumées.

Format léger inspiré de Michael Nygard :

- **Contexte** — ce qui a forcé une décision.
- **Décision** — ce qui a été acté.
- **Statut** — Accepted / Superseded by `NNNN` / Deprecated.
- **Conséquences** — gain, prix à payer, garde-fous à connaître.

Chaque ADR est numéroté en séquence (`NNNN-titre-en-kebab-case.md`).
Une fois acté, un ADR n'est pas réécrit : il est **superseded** par un
nouvel ADR qui décrit la nouvelle posture et référence l'ancien.

> **Nouveau venu ?** Le [parcours thématique](/atlas/decisions/parcours/) regroupe ces
> décisions par sujet et propose un tour cohérent — par où commencer, comment
> elles s'articulent. L'index ci-dessous reste la référence par numéro.

## Index

| #    | Titre                                                                                                                                             | Statut   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0001 | [DevSecOps périmètre repo complet, périphérie sine die](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/)                                 | Accepted |
| 0002 | [Monorepo organisé en 8 catégories](/atlas/decisions/0002-monorepo-huit-categories/)                                                              | Accepted |
| 0003 | [`packages/logos` splitté en `assets/logos` + `cli/logos`](/atlas/decisions/0003-logos-split-assets-cli/)                                         | Accepted |
| 0004 | [Volumes anonymes pour `sandbox/sillage-sandbox/`](/atlas/decisions/0004-volumes-anonymes-sillage-sandbox/)                                       | Accepted |
| 0005 | [Effect pour la programmation fonctionnelle](/atlas/decisions/0005-effect-pour-la-pf/)                                                            | Accepted |
| 0006 | [SvelteKit, Hono et Bootstrap comme socle](/atlas/decisions/0006-sveltekit-hono-bootstrap/)                                                       | Accepted |
| 0007 | [REDCap et Appwrite comme plateformes externes](/atlas/decisions/0007-redcap-appwrite-plateformes/)                                               | Accepted |
| 0008 | [CLIs thins, logique métier dans `packages/`](/atlas/decisions/0008-clis-thins-logique-dans-packages/)                                            | Accepted |
| 0009 | [`atlas` source canonique vs `amarre` standalone](/atlas/decisions/0009-atlas-source-canonique-amarre/)                                           | Accepted |
| 0010 | [`node-appwrite` SDK 25.x conservé pour `TablesDB`](/atlas/decisions/0010-node-appwrite-sdk-25/)                                                  | Accepted |
| 0011 | [Trois paquets internes marqués `private`](/atlas/decisions/0011-paquets-internes-private/)                                                       | Accepted |
| 0012 | [Neutralisation du framing institutionnel](/atlas/decisions/0012-neutralisation-framing-institutionnel/)                                          | Accepted |
| 0013 | [Documentation pour public non-expert, en français](/atlas/decisions/0013-documentation-public-non-expert-fr/)                                    | Accepted |
| 0014 | [Conventional Commits, scopes restreints](/atlas/decisions/0014-conventional-commits-scopes-restreints/)                                          | Accepted |
| 0015 | [Hooks Git via lefthook, jamais bypassés](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)                                                | Accepted |
| 0016 | [Branch protection sur `main`](/atlas/decisions/0016-branch-protection-main/)                                                                     | Accepted |
| 0017 | [Releases npm signées par OIDC sur deux registres](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)                                       | Accepted |
| 0018 | [SLA de remédiation des findings sécurité](/atlas/decisions/0018-sla-remediation-findings/)                                                       | Accepted |
| 0019 | [Dérogations explicites au workspace audit](/atlas/decisions/0019-derogations-workspace-audit/)                                                   | Accepted |
| 0020 | [Lint Svelte au preset strict](/atlas/decisions/0020-svelte-eslint-strict/)                                                                       | Accepted |
| 0021 | [Politique de dépendances pour les sandboxes](/atlas/decisions/0021-sandbox-deps-policy/)                                                         | Accepted |
| 0022 | [Convention de nommage `atlas-` pour les paquets publiés](/atlas/decisions/0022-naming-convention/)                                               | Accepted |
| 0023 | [`storybook:build` cassé en amont (Storybook 10.4 / Svelte 5.55)](/atlas/decisions/0023-storybook-build-casse-amont/)                             | Accepted |
| 0024 | [Ranges `~` sur les `dependencies` des paquets publiables](/atlas/decisions/0024-ranges-deps-publiables-tilde/)                                   | Accepted |
| 0025 | [Documentation à plusieurs niveaux (surface, profondeur, inline)](/atlas/decisions/0025-documentation-multi-niveaux/)                             | Accepted |
| 0026 | [Périmètre RGPD hors dépôt, questions ouvertes](/atlas/decisions/0026-rgpd-perimetre/)                                                            | Accepted |
| 0027 | [Rôle de security champion : ouvert (vacant)](/atlas/decisions/0027-security-champion/)                                                           | Accepted |
| 0028 | [Documentation vérifiable : un miroir contrôlable du code](/atlas/decisions/0028-documentation-verifiable/)                                       | Accepted |
| 0029 | [Pipeline de collaborations : architecture V1 (plateforme DataOps, contrat Parquet)](/atlas/decisions/0029-architecture-pipeline-collaborations/) | Accepted |
| 0030 | [Profilage de collaborations : gate RGPD, base légale et droit d'opposition](/atlas/decisions/0030-rgpd-profilage-collaborations/)                | Accepted |
| 0031 | [Outil générique open-source : contribution inter-établissements](/atlas/decisions/0031-outil-generique-open-source/)                             | Accepted |
| 0032 | [KPI documentés : généré déterministe (diff-checké) vs snapshot (append-only)](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/)               | Accepted |
| 0033 | [Contrat d'interface entre l'application (`atlas`) et le cluster](/atlas/decisions/0033-contrat-interface-cluster/)                               | Accepted |
| 0034 | [CI adaptative par chemin : court-circuit des jobs lourds](/atlas/decisions/0034-ci-adaptative-par-chemin/)                                       | Accepted |
| 0035 | [Dépôt généraliste ouvert : neutralité de domaine](/atlas/decisions/0035-depot-generaliste-ouvert/)                                               | Accepted |
| 0036 | [Migration de la documentation : VitePress → Astro Starlight](/atlas/decisions/0036-migration-vitepress-astro-starlight/)                         | Accepted |
| 0037 | [Retrait de la référence API générée (TypeDoc)](/atlas/decisions/0037-retrait-reference-api-typedoc/)                                             | Accepted |
| 0038 | [Épingler le niveau WCAG cible des tests d'accessibilité](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/)                                 | Accepted |
| 0039 | [Cadence d'audit transverse : trimestriel, rappel automatisé](/atlas/decisions/0039-cadence-audit-transverse/)                                    | Accepted |

## Quand ouvrir un ADR

Un ADR se justifie quand :

- la décision est **durable** (~ trimestres, pas semaines) ;
- une alternative crédible a été écartée et le « pourquoi » se perdrait
  dans l'historique Git sans note explicite ;
- une **tension** est assumée (compromis, dette acceptée, exception à
  une règle générale) que les contributeurs futurs doivent retrouver.

Un ADR n'est **pas** le bon endroit pour : une convention de code (→
[`docs/quality/code-style.md`](/atlas/quality/code-style/)), un guide
opérationnel (→ README de paquet), une décision opérationnelle court-terme
ou un chantier actionnable (→ une **issue GitHub**, label `enhancement`
ou `tech-debt`).

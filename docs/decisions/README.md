# Architecture Decision Records (ADR)

Trace **pourquoi** chaque choix structurant du dépôt — pas le _comment_
(couvert par la documentation thématique sous [`docs/architecture/`](../architecture/monorepo.md),
[`docs/quality/`](../quality/ci-pipeline.md) et
[`docs/collaboration/`](../collaboration/workflow.md)), mais le contexte,
l'alternative écartée et les conséquences assumées.

Format léger inspiré de Michael Nygard :

- **Contexte** — ce qui a forcé une décision.
- **Décision** — ce qui a été acté.
- **Statut** — Accepted / Superseded by `NNNN` / Deprecated.
- **Conséquences** — gain, prix à payer, garde-fous à connaître.

Chaque ADR est numéroté en séquence (`NNNN-titre-en-kebab-case.md`).
Une fois acté, un ADR n'est pas réécrit : il est **superseded** par un
nouvel ADR qui décrit la nouvelle posture et référence l'ancien.

> **Nouveau venu ?** Le [parcours thématique](./parcours.md) regroupe ces
> décisions par sujet et propose un tour cohérent — par où commencer, comment
> elles s'articulent. L'index ci-dessous reste la référence par numéro.

## Index

| #    | Titre                                                                                                                              | Statut   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0001 | [DevSecOps périmètre repo complet, périphérie sine die](0001-devsecops-perimetre-repo-sine-die.md)                                 | Accepted |
| 0002 | [Monorepo organisé en 8 catégories](0002-monorepo-huit-categories.md)                                                              | Accepted |
| 0003 | [`packages/logos` splitté en `assets/logos` + `cli/logos`](0003-logos-split-assets-cli.md)                                         | Accepted |
| 0004 | [Volumes anonymes pour `sandbox/sillage-sandbox/`](0004-volumes-anonymes-sillage-sandbox.md)                                       | Accepted |
| 0005 | [Effect pour la programmation fonctionnelle](0005-effect-pour-la-pf.md)                                                            | Accepted |
| 0006 | [SvelteKit, Hono et Bootstrap comme socle](0006-sveltekit-hono-bootstrap.md)                                                       | Accepted |
| 0007 | [REDCap et Appwrite comme plateformes externes](0007-redcap-appwrite-plateformes.md)                                               | Accepted |
| 0008 | [CLIs thins, logique métier dans `packages/`](0008-clis-thins-logique-dans-packages.md)                                            | Accepted |
| 0009 | [`atlas` source canonique vs `amarre` standalone](0009-atlas-source-canonique-amarre.md)                                           | Accepted |
| 0010 | [`node-appwrite` SDK 25.x conservé pour `TablesDB`](0010-node-appwrite-sdk-25.md)                                                  | Accepted |
| 0011 | [Trois paquets internes marqués `private`](0011-paquets-internes-private.md)                                                       | Accepted |
| 0012 | [Neutralisation du framing institutionnel](0012-neutralisation-framing-institutionnel.md)                                          | Accepted |
| 0013 | [Documentation pour public non-expert, en français](0013-documentation-public-non-expert-fr.md)                                    | Accepted |
| 0014 | [Conventional Commits, scopes restreints](0014-conventional-commits-scopes-restreints.md)                                          | Accepted |
| 0015 | [Hooks Git via lefthook, jamais bypassés](0015-hooks-git-lefthook-jamais-bypass.md)                                                | Accepted |
| 0016 | [Branch protection sur `main`](0016-branch-protection-main.md)                                                                     | Accepted |
| 0017 | [Releases npm signées par OIDC sur deux registres](0017-releases-npm-oidc-deux-registres.md)                                       | Accepted |
| 0018 | [SLA de remédiation des findings sécurité](0018-sla-remediation-findings.md)                                                       | Accepted |
| 0019 | [Dérogations explicites au workspace audit](0019-derogations-workspace-audit.md)                                                   | Accepted |
| 0020 | [Lint Svelte au preset strict](0020-svelte-eslint-strict.md)                                                                       | Accepted |
| 0021 | [Politique de dépendances pour les sandboxes](0021-sandbox-deps-policy.md)                                                         | Accepted |
| 0022 | [Convention de nommage `atlas-` pour les paquets publiés](0022-naming-convention.md)                                               | Accepted |
| 0023 | [`storybook:build` cassé en amont (Storybook 10.4 / Svelte 5.55)](0023-storybook-build-casse-amont.md)                             | Accepted |
| 0024 | [Ranges `~` sur les `dependencies` des paquets publiables](0024-ranges-deps-publiables-tilde.md)                                   | Accepted |
| 0025 | [Documentation à plusieurs niveaux (surface, profondeur, inline)](0025-documentation-multi-niveaux.md)                             | Accepted |
| 0026 | [Périmètre RGPD hors dépôt, questions ouvertes](0026-rgpd-perimetre.md)                                                            | Accepted |
| 0027 | [Rôle de security champion : ouvert (vacant)](0027-security-champion.md)                                                           | Accepted |
| 0028 | [Documentation vérifiable : un miroir contrôlable du code](0028-documentation-verifiable.md)                                       | Accepted |
| 0029 | [Pipeline de collaborations : architecture V1 (plateforme DataOps, contrat Parquet)](0029-architecture-pipeline-collaborations.md) | Accepted |
| 0030 | [Profilage de collaborations : gate RGPD, base légale et droit d'opposition](0030-rgpd-profilage-collaborations.md)                | Accepted |
| 0031 | [Outil générique open-source : contribution inter-établissements](0031-outil-generique-open-source.md)                             | Accepted |
| 0032 | [KPI documentés : généré déterministe (diff-checké) vs snapshot (append-only)](0032-kpi-determinisme-vs-snapshot.md)               | Accepted |
| 0033 | [Contrat d'interface entre l'application (`atlas`) et le cluster](0033-contrat-interface-cluster.md)                               | Accepted |
| 0034 | [CI adaptative par chemin : court-circuit des jobs lourds](0034-ci-adaptative-par-chemin.md)                                       | Accepted |
| 0035 | [Dépôt généraliste ouvert : neutralité de domaine](0035-depot-generaliste-ouvert.md)                                               | Accepted |
| 0036 | [Migration de la documentation : VitePress → Astro Starlight](0036-migration-vitepress-astro-starlight.md)                         | Accepted |

## Quand ouvrir un ADR

Un ADR se justifie quand :

- la décision est **durable** (~ trimestres, pas semaines) ;
- une alternative crédible a été écartée et le « pourquoi » se perdrait
  dans l'historique Git sans note explicite ;
- une **tension** est assumée (compromis, dette acceptée, exception à
  une règle générale) que les contributeurs futurs doivent retrouver.

Un ADR n'est **pas** le bon endroit pour : une convention de code (→
[`docs/quality/code-style.md`](../quality/code-style.md)), un guide
opérationnel (→ README de paquet), une décision opérationnelle court-terme
ou un chantier actionnable (→ une **issue GitHub**, label `enhancement`
ou `tech-debt`).

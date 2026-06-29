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

| #    | Titre                                                                                                                                                           | Statut          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 0001 | [DevSecOps périmètre repo complet, périphérie sine die](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/)                                               | Accepted        |
| 0002 | [Monorepo organisé en 8 catégories](/atlas/decisions/0002-monorepo-huit-categories/)                                                                            | Accepted        |
| 0003 | [`packages/logos` splitté en `assets/logos` + `cli/logos`](/atlas/decisions/0003-logos-split-assets-cli/)                                                       | Accepted        |
| 0004 | [Volumes anonymes pour `sandbox/sillage-sandbox/`](/atlas/decisions/0004-volumes-anonymes-sillage-sandbox/)                                                     | Accepted        |
| 0005 | [Effect pour la programmation fonctionnelle](/atlas/decisions/0005-effect-pour-la-pf/)                                                                          | Accepted        |
| 0006 | [SvelteKit, Hono et Bootstrap comme socle](/atlas/decisions/0006-sveltekit-hono-bootstrap/)                                                                     | Accepted        |
| 0007 | [REDCap et Appwrite comme plateformes externes](/atlas/decisions/0007-redcap-appwrite-plateformes/)                                                             | Accepted        |
| 0008 | [CLIs thins, logique métier dans `packages/`](/atlas/decisions/0008-clis-thins-logique-dans-packages/)                                                          | Accepted        |
| 0009 | [`atlas` source canonique vs `amarre` standalone](/atlas/decisions/0009-atlas-source-canonique-amarre/)                                                         | Accepted        |
| 0010 | [`node-appwrite` SDK 25.x conservé pour `TablesDB`](/atlas/decisions/0010-node-appwrite-sdk-25/)                                                                | Accepted        |
| 0011 | [Trois paquets internes marqués `private`](/atlas/decisions/0011-paquets-internes-private/)                                                                     | Accepted        |
| 0012 | [Neutralisation du framing institutionnel](/atlas/decisions/0012-neutralisation-framing-institutionnel/)                                                        | Accepted        |
| 0013 | [Documentation pour public non-expert, en français](/atlas/decisions/0013-documentation-public-non-expert-fr/)                                                  | Accepted        |
| 0014 | [Conventional Commits, scopes restreints](/atlas/decisions/0014-conventional-commits-scopes-restreints/)                                                        | Accepted        |
| 0015 | [Hooks Git via lefthook, jamais bypassés](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)                                                              | Accepted        |
| 0016 | [Branch protection sur `main`](/atlas/decisions/0016-branch-protection-main/)                                                                                   | Accepted        |
| 0017 | [Releases npm signées par OIDC sur deux registres](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)                                                     | Accepted        |
| 0018 | [SLA de remédiation des findings sécurité](/atlas/decisions/0018-sla-remediation-findings/)                                                                     | Accepted        |
| 0019 | [Dérogations explicites au workspace audit](/atlas/decisions/0019-derogations-workspace-audit/)                                                                 | Accepted        |
| 0020 | [Lint Svelte au preset strict](/atlas/decisions/0020-svelte-eslint-strict/)                                                                                     | Accepted        |
| 0021 | [Politique de dépendances pour les sandboxes](/atlas/decisions/0021-sandbox-deps-policy/)                                                                       | Accepted        |
| 0022 | [Convention de nommage `atlas-` pour les paquets publiés](/atlas/decisions/0022-naming-convention/)                                                             | Accepted        |
| 0023 | [`storybook:build` cassé en amont (Storybook 10.4 / Svelte 5.55)](/atlas/decisions/0023-storybook-build-casse-amont/)                                           | Accepted        |
| 0024 | [Ranges `~` sur les `dependencies` des paquets publiables](/atlas/decisions/0024-ranges-deps-publiables-tilde/)                                                 | Accepted        |
| 0025 | [Documentation à plusieurs niveaux (surface, profondeur, inline)](/atlas/decisions/0025-documentation-multi-niveaux/)                                           | Accepted        |
| 0026 | [Périmètre RGPD hors dépôt, questions ouvertes](/atlas/decisions/0026-rgpd-perimetre/)                                                                          | Accepted        |
| 0027 | [Rôle de security champion : ouvert (vacant)](/atlas/decisions/0027-security-champion/)                                                                         | Accepted        |
| 0028 | [Documentation vérifiable : un miroir contrôlable du code](/atlas/decisions/0028-documentation-verifiable/)                                                     | Accepted        |
| 0029 | [Pipeline de collaborations : architecture V1 (plateforme DataOps, contrat Parquet)](/atlas/decisions/0029-architecture-pipeline-collaborations/)               | Accepted        |
| 0030 | [Profilage de collaborations : gate RGPD, base légale et droit d'opposition](/atlas/decisions/0030-rgpd-profilage-collaborations/)                              | Accepted        |
| 0031 | [Outil générique open-source : contribution inter-établissements](/atlas/decisions/0031-outil-generique-open-source/)                                           | Amended by 0079 |
| 0032 | [KPI documentés : généré déterministe (diff-checké) vs snapshot (append-only)](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/)                             | Accepted        |
| 0033 | [Contrat d'interface entre l'application (`atlas`) et le cluster](/atlas/decisions/0033-contrat-interface-cluster/)                                             | Accepted        |
| 0034 | [CI adaptative par chemin : court-circuit des jobs lourds](/atlas/decisions/0034-ci-adaptative-par-chemin/)                                                     | Accepted        |
| 0035 | [Dépôt généraliste ouvert : neutralité de domaine](/atlas/decisions/0035-depot-generaliste-ouvert/)                                                             | Accepted        |
| 0036 | [Migration de la documentation : VitePress → Astro Starlight](/atlas/decisions/0036-migration-vitepress-astro-starlight/)                                       | Accepted        |
| 0037 | [Retrait de la référence API générée (TypeDoc)](/atlas/decisions/0037-retrait-reference-api-typedoc/)                                                           | Accepted        |
| 0038 | [Épingler le niveau WCAG cible des tests d'accessibilité](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/)                                               | Accepted        |
| 0039 | [Cadence d'audit transverse : trimestriel, rappel automatisé](/atlas/decisions/0039-cadence-audit-transverse/)                                                  | Accepted        |
| 0040 | [Caches applicatifs : flux + backing-service injectable vs fichier local](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/)                        | Accepted        |
| 0041 | [Stratégie d'authentification du service CRF (Hono)](/atlas/decisions/0041-strategie-auth-service-crf-hono/)                                                    | Accepted        |
| 0042 | [Périmètre des sandbox : dev/test local dans atlas, pas dans cluster](/atlas/decisions/0042-perimetre-sandbox-atlas-vs-cluster/)                                | Accepted        |
| 0043 | [Publication des images de déploiement sur GHCR](/atlas/decisions/0043-publication-images-ghcr/)                                                                | Accepted        |
| 0045 | [Runtime Effect central par type de processus](/atlas/decisions/0045-runtime-central-effect/)                                                                   | Accepted        |
| 0046 | [Frontière Effect ↔ SvelteKit](/atlas/decisions/0046-frontiere-effect-sveltekit/)                                                                               | Accepted        |
| 0047 | [Stratégie de validation (Effect Schema, zod en cohabitation)](/atlas/decisions/0047-strategie-validation-schema-zod/)                                          | Accepted        |
| 0048 | [Modèle d'erreur HTTP (atlas-errors conservé + couture Effect)](/atlas/decisions/0048-modele-erreur-http/)                                                      | Accepted        |
| 0049 | [Convention de test Effect (it.effect, layers partagés, garde-fou)](/atlas/decisions/0049-convention-test-effect/)                                              | Accepted        |
| 0050 | [Limite de l'audit knip face aux peerDependencies](/atlas/decisions/0050-limite-knip-peer-deps/)                                                                | Accepted        |
| 0051 | [Rétrospective du chantier socle Effect (E1–E14)](/atlas/decisions/0051-retrospective-socle-effect/)                                                            | Accepted        |
| 0052 | [Charte rédactionnelle de la documentation (règles de relecture)](/atlas/decisions/0052-charte-redactionnelle-documentation/)                                   | Accepted        |
| 0053 | [Merge commit imposé sur `main` (abandon du squash)](/atlas/decisions/0053-strategie-merge-commit-main/)                                                        | Accepted        |
| 0054 | [Ingestion massive OpenAlex par snapshot S3 (works + authors)](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)                                            | Accepted        |
| 0055 | [Catégorie dataops/ : code DataOps en Python natif](/atlas/decisions/0055-categorie-dataops-python/)                                                            | Accepted        |
| 0056 | [Registre de drifts : catalogue indexé des écarts révélés à l'exécution](/atlas/decisions/0056-registre-drifts/)                                                | Amended by 0071 |
| 0057 | [Reproductibilité : tests hermétiques et fixtures figées](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)                                            | Accepted        |
| 0058 | [Chargement de l'index (mart→Postgres) : report de `index_load` faute de producteur researchers](/atlas/decisions/0058-report-index-load/)                      | Accepted        |
| 0059 | [Producteur par chercheur : ancrage `author_id`, purge d'opposition au grain `(author_id, work_id)`](/atlas/decisions/0059-mart-researchers-author-id-grain/)   | Accepted        |
| 0060 | [Consignation des reconnaissances multi-agents pré-implémentation](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)                            | Accepted        |
| 0061 | [Accélérer la CI : cache de contenu, parallélisation des jobs, court-circuit élargi](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)              | Accepted        |
| 0062 | [MLOps niveau 1→2 : suivi de modèles, détection de dérive, réentraînement déclenché](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)                   | Amended by 0079 |
| 0063 | [Échantillon cohérent par construction sur les petits bancs (authors dérivés des works)](/atlas/decisions/0063-echantillon-coherent-banc/)                      | Accepted        |
| 0064 | [Collecte « veille médiatique » (GKG v2) par pull HTTP incrémental, code-location dédié](/atlas/decisions/0064-collecte-mediawatch-gkg/)                        | Accepted        |
| 0065 | [Qualifier une organisation comme « université » : heuristique de nom + référentiel](/atlas/decisions/0065-classification-universites-heuristique-referentiel/) | Accepted        |
| 0066 | [Cache Turbo des checks dataops : package.json minimal et entrée dans le workspace](/atlas/decisions/0066-cache-turbo-dataops/)                                 | Accepted        |
| 0067 | [Modèle prédictif d'uplift FWCI sur EUNICoast (réorientation du pipeline citation)](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)                        | Accepted        |
| 0068 | [Suivi de dérive du modèle d'uplift FWCI (drift applicatif, porte de sécurité)](/atlas/decisions/0068-suivi-derive-modele-uplift/)                              | Accepted        |
| 0069 | [Scan, signature et provenance des images conteneur publiées sur GHCR](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)                            | Accepted        |
| 0070 | [Page de preuves (vitrine d'orientation) et doctrine des badges admissibles](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)                       | Accepted        |
| 0071 | [Méta-gouvernance documentaire exécutable et cartographie de la couverture E2E](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)            | Accepted        |
| 0072 | [Tests basés sur les propriétés au dataops Python (Hypothesis)](/atlas/decisions/0072-property-based-testing-dataops-python/)                                   | Accepted        |
| 0073 | [Corriger le code, pas l'état, et garde-fou de cible de déploiement](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)                        | Accepted        |
| 0074 | [Typologie documentaire d'intention (Diátaxis)](/atlas/decisions/0074-diataxis-typologie-documentation/)                                                        | Accepted        |
| 0075 | [Déploiement prod par digest : atlas fournit les points d'injection, cluster les remplit](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)   | Accepted        |
| 0076 | [Portails d'orientation et accueil par intention](/atlas/decisions/0076-portails-orientation-accueil-par-intention/)                                            | Amended by 0078 |
| 0077 | [Topologie : deux dépôts cluster & atlas, frontière outillée](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/)                                       | Accepted        |
| 0078 | [Barre latérale thématique, navigation Diátaxis intra-catégorie](/atlas/decisions/0078-sidebar-thematique-navigation-diataxis-intra-categorie/)                 | Accepted        |
| 0079 | [Boucle fermée dérive → réentraînement, active par défaut (citation)](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/)                     | Accepted        |
| 0080 | [Capture assistée des drifts au point d'échec](/atlas/decisions/0080-capture-assistee-drifts-point-echec/)                                                      | Accepted        |
| 0081 | [Modèle de prévision du volume d'articles par université (mediawatch)](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/)                      | Accepted        |
| 0082 | [Boucle fermée dérive → réentraînement, active par défaut (mediawatch)](/atlas/decisions/0082-boucle-fermee-drift-retrain-mediawatch/)                          | Accepted        |
| 0083 | [Câblage d'OpenSSF Scorecard (note supply-chain et badge en tête)](/atlas/decisions/0083-openssf-scorecard-cable/)                                              | Accepted        |

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

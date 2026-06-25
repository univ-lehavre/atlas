---
title: Topologie des dépôts cluster & atlas — feuille de route 2026-06-11
---

> Date du plan : 2026-06-11. Plan **transverse** (couvre `atlas` ET `cluster`) — déposé côté applicatif conformément à la frontière [ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md) (« un plan-maître transverse reste côté applicatif ; sa phase _socle_ référence le dépôt cluster »).

> **La décision et son raisonnement** (garder deux dépôts, ne pas fusionner ni créer de 3ᵉ dépôt, scoring des 5 options, justifications par les faits, correction adversariale) vivent dans l'[ADR 0077](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/). **Cette page porte le _comment_** : la feuille de route d'exécution du « statu quo renforcé » acté par cet ADR. Méthode d'analyse : multi-agents avec lecture réelle du code des deux dépôts (cartographie 6 dimensions → 5 architectures-cibles → panel de notation → vérification adversariale par 3 sceptiques indépendants).

## Feuille de route — réversible et à faible coût d'abord

Chaque phase est **additive, réversible, et ne casse aucun DOI**. Une PR par phase.

### Phase 0 — Hygiène de citabilité (½ j, priorité absolue, zéro risque) — `cluster` + `atlas`

C'est ce qu'un évaluateur académique voit en premier, et c'est cassé aujourd'hui.

- **cluster** : `CITATION.cff` incohérent — `version: 2.6.1` (≠ version réelle du package) et DOI placeholder `zenodo.XXXXXXX`. Corriger la version et remplacer par `10.5281/zenodo.20287209`.
- **atlas** : `CITATION.cff` **absent**. Le créer avec le DOI `10.5281/zenodo.18310357`.
- **Done** : `cffconvert --validate` passe dans les deux dépôts ; DOI réels présents.

### Phase 1 — Lever la double « source de vérité » (½ j, prose seulement) — `atlas`

Le contrat machine-lisible (`cluster/contract/*.example.yaml`, `contract_version 1.0`) est **normatif**.

- Réécrire l'en-tête de l'**ADR atlas 0033** : remplacer « source de vérité unique » par « **vue dérivée** du contrat publié par cluster ([ADR 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md)) », avec lien.
- **Done** : un seul document se déclare normatif sur l'interface ; l'autre s'en déclare dérivé.

### Phase 2 — Index ADR-système + liens croisés (≈1 j) — `cluster` + `atlas`

- Créer un `docs/decisions/INDEX-SYSTEME.md` (cluster) + parcours miroir (atlas) listant les ~10-12 ADR transverses, **préfixés `CL-` / `AT-`** (contrat, dataops, merge-commit 0037/0053, reproductibilité 0052/0057, drifts 0034/0042/0056). On **contourne la collision `0033` par namespace de citation, sans renumérotation**.
- Étendre `lychee` (cluster, déjà en CI) et `starlight-links-validator` (atlas) aux URL `github.com` de l'autre dépôt.
- **Done** : les ADR transverses sont citables sans ambiguïté ; les liens croisés sont vérifiés en CI.

### Phase 3 — Le livrable qui compte vraiment (≈2 j, **bloquant en CI**) — `cluster`

- Porter le pattern de validation par schéma déjà présent côté atlas (`drifts.schema.json`, zod) aux trois `contract/*.example.yaml`.
- Ajouter un job CI cluster qui **vérifie que les FQDN / noms de Secret du contrat correspondent aux Services / Secrets réels de `platform/`** — tout **intra-cluster, un seul working tree, zéro nested-virt**.
- Attrape en revue (pas au run) : rename de Service, rotation de Secret, dérive d'endpoint. Lève la « duplication assumée » de l'ADR 0043.
- **Done** : un job CI bloquant échoue dès qu'un FQDN/Secret du contrat ne correspond plus à `platform/`.

### Phase 4 — e2e : assumé manuel, pas un gate CI — `cluster` (+ atlas en consommateur)

- Garder le **scénario 29** comme **preuve datée périodique**, gardée par `bench-freshness.yml` (rappel par issue). Lui donner une entrée `target` dédiée dans `test/lima/runs-history.yaml`.
- **Ne pas** le présenter comme un check CI bloquant — il ne le sera jamais (contrainte d'infra).
- _Optionnel_ : décider si `cluster-dataops` sort du warn-only 90 j pour s'aligner sur une cadence plus stricte.
- **Done** : la cadence du scénario 29 est suivie et alertée ; aucune promesse de gate CI.

### Anti-duplication ruff sans 3ᵉ dépôt

- Mettre le sous-bloc `[tool.ruff.lint]` canonique côté cluster et le **copier-générer** (fichier vendoré) dans atlas avec un check `--check` « est à jour » en CI — sur le modèle de la carte de paquets déjà générée par atlas.
- **Attention** (relevé adversarial) : ce n'est **pas** une copie verbatim du `pyproject.toml` — `target-version` diffère (`py312` vs `py310`) et cluster a un `extend-exclude`. Le check doit extraire **chirurgicalement le sous-bloc `[tool.ruff.lint]`**, pas le fichier entier. Quantifier ce coût avant de l'inscrire ; si trop fragile, laisser les deux blocs indépendants (la dérive y est bénigne).

## Risque principal et couverture

**Risque n°1 — le « durcissement de façade ».** Les phases 0-3 sont peu chères, donc tentantes, mais seule la **Phase 3** supprime réellement de la dérive silencieuse ; la Phase 4 (e2e) **ne peut pas** devenir un gate CI. Si l'on s'arrête à un vernis cosmétique en croyant le problème réglé, on peut même _relâcher_ la discipline humaine et laisser diverger les ADR jumeaux (0037/0053, 0052/0057) plus vite qu'avant.

**Couverture :**

1. Faire de la **Phase 3 le vrai livrable-cible bloquant**, dès le départ — c'est elle, pas l'e2e, qui attrape >80 % de la dérive (rename de Service, rotation de Secret) au moment de la revue.
2. Reconnaître que, projet **bus-factor 1** avec un banc 30 min non-CI-able, la cohérence fine du contrat **restera partiellement tenue par discipline** — et que la **fusion ne résoudrait pas ce point** (la virtualisation imbriquée ne rentre pas davantage dans un runner GitHub après fusion).
3. Calibrer le smoke-test e2e sur les profils distincts déjà présents (overlays kustomize `overlays/bench` SeaweedFS vs `overlays/prod` ObjectBucketClaim Ceph) pour éviter les faux positifs qui le feraient désactiver.
4. Inscrire le **seuil de bascule** : _si_ le consommateur TS du Parquet est écrit **et** la charge data croît, rouvrir la question (c) en évaluant **dataops complet (Dagster + dbt) → cluster**.

## Journal d'exécution

| Date       | Phase | Événement                                                                                              |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------ |
| 2026-06-11 | —     | Plan rédigé. Analyse multi-agents (lecture réelle du code) + vérification adversariale (3 sceptiques). |

---
title: "0079 — Boucle fermée dérive → réentraînement, active par défaut (citation)"
---

## Contexte

L'[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) a porté `citation` au
**MLOps niveau 1→2** : suivi MLflow, **mesure** de dérive (Evidently, asset check non bloquant
`evidently_embedding_drift`), et entraînement continu (CT) **orchestré** par un `@schedule` et un
`@sensor` — mais **STOPPED par défaut** : « le code **permet** la cadence ; **activer** le schedule
relève du **déployeur** ». La dérive mesurée **informe** (score journalisé MLflow) et nourrit la
_décision humaine_ d'ajuster la cadence ; **aucun seuil ne déclenche le réentraînement**.

La page [Normes et pratiques appliquées](/atlas/quality/normes/) classe en conséquence le
**« Continuous training _autonome_ »** dans « Ce qui n'est pas encore appliqué » : la **boucle fermée**
« seuil de dérive → réentraînement automatique » n'existe pas. C'est précisément cette brique — le cœur
d'un MLOps niveau 2 _autonome_ — que le présent ADR ajoute.

Fermer la boucle **rompt** une posture tenue partout : « le code permet, le déployeur arme » (sensors
STOPPED par défaut, [ADR 0031](/atlas/decisions/0031-outil-generique-open-source/) — capacité vs
décision d'instance). Un réentraînement déclenché **sans geste humain** est exactement le
« re-training silencieux » que les commentaires de code disaient vouloir éviter. Cette rupture doit donc
être **actée explicitement** — c'est l'objet de cet ADR.

**Un piège de conception doit être traité de front.** La dérive est mesurée N vs N-1 **en aval** de
`researcher_embeddings`, _dans_ `transform_job`. Réentraîner sur les **mêmes** données ne fait **pas**
disparaître la dérive : elle vient de l'arrivée de **données neuves** (snapshot OpenAlex), pas du
modèle. Une boucle naïve « dérive détectée → relance » **s'emballerait** (relance perpétuelle sur la
même donnée). La boucle n'a de sens que **conditionnée à l'avancée de l'ingestion**.

## Décision

> **`citation` ferme la boucle MLOps : la dérive mesurée déclenche AUTOMATIQUEMENT un réentraînement
> (`transform_job`), et ce sensor est ACTIF PAR DÉFAUT (`RUNNING`). Le déclenchement n'a lieu que si la
> dérive est confirmée ET que le watermark d'ingestion a AVANCÉ depuis le dernier réentraînement —
> garantissant la terminaison. Le déployeur peut DÉSARMER la boucle (opt-out via une variable
> d'environnement), au lieu de devoir l'armer. C'est une autonomie réelle, assumée et bornée.**

### La boucle, et sa terminaison

Le verdict de dérive (`drift_detected`, `drift_score`, et l'état complet du **watermark d'ingestion**
vu au moment de la mesure) est **persisté en S3** par l'asset check (`drift/researcher_embeddings/_drift_verdict.json`)
— le journal MLflow étant best-effort et illisible d'un sensor. Un sensor `retrain_on_drift` lit ce
verdict et déclenche `transform_job` **si et seulement si** : (a) la dérive est détectée, (b) le
watermark vu **diffère** de celui du dernier réentraînement (donnée neuve), (c) un cooldown est écoulé.

**Terminaison prouvée.** Le réentraînement **ne ré-ingère pas** : il ne fait pas avancer le watermark.
Le run post-retrain re-mesure donc une dérive sur le **même** watermark → condition (b) fausse → SKIP.
La boucle atteint un **point fixe en une itération** ; elle ne peut pas s'emballer. S'y ajoutent une
**déduplication** par identifiant du verdict (un même verdict ne déclenche qu'un retrain) et un
**cooldown** (anti-flapping du test statistique). Le détail vit dans la fonction pure
`evaluate_drift_retrain` (testée), pas dans cet ADR.

### Active par défaut, opt-out — la rupture assumée

Contrairement au `@schedule` et au `@sensor` watermark de l'[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)
(STOPPED, le déployeur arme), le sensor `retrain_on_drift` est **`RUNNING` par défaut** : l'autonomie
est la posture **par défaut**. Le déployeur **opt-out** via `CITATION_RETRAIN_AUTO=off` (la boucle est
alors **absente**, pas un sensor STOPPED). La cadence fine reste une **valeur d'instance**
(`CITATION_RETRAIN_COOLDOWN_S`). C'est un **renversement ciblé** de la charge : armer devient le défaut,
désarmer devient le geste — pour cette brique précise, sur ce pipeline précis.

### Périmètre : `citation` seulement

`mediawatch` v1 (« articles seulement ») n'a **ni embeddings ni Evidently** : aucun signal de dérive à
fermer. La boucle ne le concerne pas ; son écart « CT autonome » subsiste, le jour où il aura une mesure
de dérive.

### Conformité RGPD honorée par construction

Le réentraînement automatique **re-dérive depuis `curated` filtré** sur le registre d'opposition exactement
comme un run manuel : `transform_job` ré-exécute les modèles dbt (anti-join `opposition_pairs`) et
`researcher_embeddings` (exclusion des couples opposés). La boucle déclenche le **même chemin re-dérivé**,
**sans contournement** du filtre d'opposition de l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)
et de l'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/). Voir
[Ré-dérivabilité du mart et de l'index](/atlas/architecture/re-derivabilite-mart-index/).

## Alternatives écartées

- **Boucle « dérive seule → retrain » (sans condition de donnée neuve).** Écartée : **emballement**
  garanti — réentraîner sur les mêmes données ne dissipe pas la dérive, le sensor relancerait en
  continu. Un cooldown seul ne fait que ralentir la boucle, il ne la **borne** pas.
- **Garder la posture STOPPED (le déployeur arme).** Écartée : c'est l'état de l'[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/),
  qui **ne ferme pas** la boucle — l'autonomie demandée n'existe pas si le déclenchement reste un geste
  humain.
- **Déclencher depuis MLflow (lire le verdict journalisé).** Écartée : MLflow est best-effort, non
  atomique, et un sensor (process séparé) ne lit pas fiablement son état. On persiste un verdict S3
  dédié, à la manière du watermark.
- **Étendre la boucle à `mediawatch`.** Écartée à ce stade : pas de signal de dérive (ni embeddings ni
  Evidently). À rouvrir si une mesure de dérive y apparaît.

## Statut

Accepted (2026-06-26). **Amende** l'[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)
sur le **seul** point du déclenchement par dérive : le CT _par dérive_ passe de **STOPPED à RUNNING**
(actif par défaut) ; le `@schedule` calendaire et le `@sensor` watermark de 0062 **restent STOPPED**,
inchangés. **Amende** l'[ADR 0031](/atlas/decisions/0031-outil-generique-open-source/) sur ce seul point :
l'autonomie du réentraînement est une **capacité exercée par défaut** (opt-out), là où 0031 posait
« capacité fournie, décision au déployeur » (opt-in) — le reste de 0031 (neutralité, généricité,
multi-tenant) **demeure**. **S'appuie sur** l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)
(RGPD honoré par construction, aucun contournement du filtre d'opposition). Porte `citation` au **MLOps
niveau 2 autonome**.

## Conséquences

**Bénéfices.** La boucle MLOps est **fermée** : la dérive ne se contente plus d'informer, elle agit. Le
« Continuous training autonome » passe de « pas encore appliqué » à **appliqué** pour `citation`.
L'autonomie est **réelle** (active par défaut) tout en restant **sûre** (terminaison prouvée) et
**maîtrisable** (kill-switch d'instance).

**Prix à payer.** Une **rupture de posture** assumée (« le déployeur arme » → « le déployeur désarme »),
limitée à cette brique. Un **garde-fou anti-emballement obligatoire** (la boucle est conditionnée à la
donnée neuve — une boucle « dérive seule » serait un bug). Un **verdict S3 de plus** à maintenir (signal
de contrôle écrasable, pas une donnée).

**Garde-fous.** **Terminaison** prouvée (point fixe en une itération : le retrain n'avance pas le
watermark). **Déduplication** par identifiant de verdict + **cooldown** d'instance. **Opt-out**
`CITATION_RETRAIN_AUTO=off` = kill-switch immédiat, sans redéploiement de code. **Observabilité** : chaque
réentraînement automatique est tracé (MLflow + lineage OpenLineage). **RGPD** : re-dérivation depuis
`curated` filtré, aucun contournement de l'opposition. **Réversibilité** : `git revert` ; le verdict S3
est un signal écrasable, aucune donnée détruite.

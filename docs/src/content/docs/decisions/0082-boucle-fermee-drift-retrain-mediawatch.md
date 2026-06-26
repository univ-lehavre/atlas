---
title: "0082 — Boucle fermée dérive → réentraînement, active par défaut (mediawatch)"
---

## Contexte

L'[ADR 0079](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/) a fermé la boucle
MLOps de `citation` : la dérive mesurée déclenche **automatiquement** le réentraînement, sensor **actif
par défaut** (opt-out), borné par l'avancée du watermark d'ingestion (terminaison prouvée). À l'époque,
`mediawatch` en était **explicitement exclu** — il n'avait « ni embeddings ni Evidently, aucun signal de
dérive à fermer ».

Ce verrou est **levé**. L'[ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/)
a doté `mediawatch` d'un modèle de prévision du volume d'articles, donc d'un **signal de dérive**
(Evidently sur les prévisions, asset check `evidently_forecast_drift`, avec porte bloquante sur la
bascule `predictive → descriptive`). La page [Normes](/atlas/quality/normes/) note depuis que le CT
autonome de `mediawatch` est « la boucle à câbler ». C'est l'objet du présent ADR.

Le **piège d'emballement** est le même que pour `citation` : la dérive est mesurée en aval du modèle ;
réentraîner sur les **mêmes** données ne la dissipe pas (elle vient de la donnée neuve). Une boucle
naïve s'emballerait. Et une **spécificité** distingue `mediawatch` : son signal de « donnée neuve » n'est
pas un watermark global (comme `citation`) mais l'avancée des **partitions GKG ingérées**
(`dt=YYYY-MM-DD` sous `raw/gkg/`) — c'est déjà le signal de son CT par calendrier
([ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)).

## Décision

> **`mediawatch` ferme sa boucle MLOps, par GÉNÉRALISATION du patron de
> l'[ADR 0079](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/) : la dérive
> mesurée déclenche automatiquement le réentraînement (`transform_job`), via un sensor `retrain_on_drift`
> ACTIF PAR DÉFAUT (opt-out `MEDIAWATCH_RETRAIN_AUTO=off`). Le déclenchement n'a lieu que si la dérive
> est confirmée ET que les PARTITIONS GKG ingérées ont avancé depuis le dernier réentraînement —
> garantissant la terminaison. Aucune nouvelle posture n'est décidée : c'est l'application à un second
> pipeline d'une décision déjà actée.**

### Ce qui est identique à l'ADR 0079

Le verdict de dérive est **persisté en S3** (`drift/university_timeline_forecast/_drift_verdict.json`)
par l'asset check — un `AssetCheckResult` n'est pas lisible par un sensor externe. Le sensor lit ce
verdict et déclenche `transform_job` si (a) dérive confirmée, (b) **donnée neuve**, (c) cooldown écoulé.
**Terminaison prouvée** : le réentraînement ne ré-ingère pas → le run post-retrain re-mesure la dérive
sur le **même** signal de donnée → SKIP (point fixe en une itération). S'y ajoutent **déduplication** par
identifiant de verdict et **cooldown** (`MEDIAWATCH_RETRAIN_COOLDOWN_S`). Le sensor est **`RUNNING` par
défaut** ; l'opt-out **retire** le sensor (pas un sensor STOPPED).

### Ce qui diffère (spécificité mediawatch)

Le signal de « donnée neuve » est l'ensemble des **partitions GKG ingérées** (les `dt=` sous
`raw/gkg/`), pas un watermark global. Le verdict porte donc un champ `partitions` (et non `watermark`) ;
le garde-fou compare l'ensemble des partitions vu au moment de la mesure à celui du dernier retrain. La
fonction `ingested_partitions` — déjà utilisée par le CT calendaire de `mediawatch` — est extraite dans
un module neutre (`partitions.py`) partagé, pour éviter une dépendance circulaire entre la définition de
la code-location et l'asset de drift.

### Périmètre et conformité

`mediawatch` v1 reste « articles seulement » : aucune donnée personnelle, donc pas de filtre RGPD à
honorer (à la différence de `citation`, [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)) ;
le réentraînement re-dérive simplement le mart timeline puis ré-entraîne le modèle de prévision. Le CT
**calendaire + par ingestion** existant ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/),
sensors STOPPED) reste inchangé : la boucle par dérive s'ajoute, elle ne le remplace pas.

## Alternatives écartées

- **Garder `mediawatch` hors de la boucle (statu quo de l'ADR 0079).** Écartée : la raison de
  l'exclusion (pas de signal de dérive) a disparu avec l'ADR 0081 ; laisser le CT autonome « à câbler »
  indéfiniment serait une dette inutile, le patron étant déjà éprouvé sur `citation`.
- **Boucle « dérive seule → retrain » (sans condition de donnée neuve).** Écartée : **emballement**
  garanti, même raison que l'ADR 0079.
- **Posture STOPPED par défaut (le déployeur arme), asymétrique avec `citation`.** Écartée : introduirait
  une incohérence inter-pipelines sans justification (les deux pipelines ont désormais le même type de
  signal). La cohérence prime ; le déployeur garde l'opt-out.
- **Réutiliser le watermark plutôt que les partitions.** Sans objet : `mediawatch` n'a pas de watermark
  global, son signal d'ingestion **est** l'ensemble des partitions GKG.

## Statut

Accepted (2026-06-26). **Généralise** l'[ADR 0079](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/)
(boucle fermée active par défaut) à `mediawatch` ; **n'introduit aucune posture nouvelle** (mêmes
amendements de fond aux ADR [0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) et
[0031](/atlas/decisions/0031-outil-generique-open-source/) que 0079, transposés). **S'appuie sur**
l'[ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/) (qui fournit le signal
de dérive) et l'[ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/) (les partitions GKG comme
signal de donnée neuve). Porte `mediawatch` au **MLOps niveau 2 autonome**, à parité avec `citation`.

## Conséquences

**Bénéfices.** Les deux pipelines DataOps ont désormais une **boucle fermée autonome homogène** ; le
dernier écart MLOps que `normes.md` signalait (« CT autonome mediawatch — boucle à câbler ») est comblé.

**Prix à payer.** Un verdict S3 de plus à maintenir (signal de contrôle écrasable). La même **rupture de
posture** que l'ADR 0079 (« le déployeur désarme »), désormais sur les deux pipelines — assumée et déjà
actée.

**Garde-fous.** **Terminaison** prouvée (point fixe : le retrain n'avance pas les partitions ingérées).
**Déduplication** + **cooldown** d'instance. **Opt-out** `MEDIAWATCH_RETRAIN_AUTO=off` = kill-switch sans
redéploiement. **Observabilité** : chaque retrain tracé (MLflow + lineage). Le sensor CT calendaire reste
STOPPED, inchangé.

"""Tests du point d'entrée : la code-location « pageviews » se charge (assets Python
inconditionnels + checks GE/drift), et le câblage K8s des pods de run est correct.

Le serveur gRPC importe ce module : il DOIT être chargeable même sans dbt (le projet
``pageviews-dbt`` peut être vide / le manifest absent en checkout de travail). On vérifie
donc la DÉGRADATION PROPRE (``dbt_components`` → ``([], {})`` → seul ``ingestion_job``, pas
de ``transform_job``) ET, par rechargement du module avec un ``dbt_components`` mocké, la
branche NOMINALE (``transform_job`` enregistré). Le reste est hermétique : ``_s3_env_from``,
``_ingest_cron``, ``_RUN_ENV`` (piège ADR 0086 : lineage + MLflow réinjectés au run).
"""

import importlib

from dagster import (
    AssetKey,
    DefaultScheduleStatus,
    Definitions,
    asset,
)

from pageviews_dagster import definitions

# ── Chargement de la code-location (assets Python inconditionnels) ───────────


def test_definitions_loads() -> None:
    # Le serveur gRPC importe ce module : il doit être chargeable (Definitions valide).
    assert isinstance(definitions.defs, Definitions)


def test_unconditional_python_assets_registered() -> None:
    # Assets Python enregistrés INCONDITIONNELLEMENT (code-location chargeable sans dbt).
    keys = {k.to_user_string() for k in definitions.defs.resolve_asset_graph().get_all_asset_keys()}
    assert "ref_universities" in keys
    assert "raw_pageviews" in keys
    assert "forecast_views" in keys
    assert "forecast_manifest" in keys


def test_asset_checks_registered() -> None:
    # Les 3 asset checks CIBLENT des assets Python toujours présents → INCONDITIONNELS :
    # porte GE du brut, porte GE du mart servi, porte de dérive du modèle (ADR 0098/0068).
    names = {k.name for c in definitions.defs.asset_checks for k in c.check_keys}
    assert names == {"ge_raw_pageviews", "ge_marts_views_forecast", "evidently_forecast_drift"}


# ── Job d'ingestion (référentiel + brut, câblage K8s du run) ─────────────────


def test_ingestion_job_selects_ref_and_raw() -> None:
    job = definitions.defs.get_job_def("ingestion_job")
    assert job is not None
    keys = {k.to_user_string() for k in job.asset_layer.executable_asset_keys}
    assert "ref_universities" in keys
    assert "raw_pageviews" in keys


def test_ingestion_job_carries_run_k8s_config() -> None:
    # Le job porte le Secret S3 + les env lineage/MLflow au niveau du RUN (tags k8s).
    job = definitions.defs.get_job_def("ingestion_job")
    assert "dagster-k8s/config" in job.tags


def test_ingestion_job_relays_ref_source_to_run_pod(monkeypatch) -> None:
    # GARDE-FOU drift D25 : raw_pageviews (dans ingestion_job) lit PAGEVIEWS_REF_SOURCE DANS le
    # pod de run pour trouver le référentiel INGÉRÉ (source=ingested). L'ancien ingestion_job
    # utilisait une config SANS relais → le run retombait sur `seed` et ne trouvait PAS le
    # référentiel → « No files found ». On vérifie que la var est bien relayée au run.
    import importlib

    monkeypatch.setenv("PAGEVIEWS_REF_SOURCE", "ingested")
    reloaded = importlib.reload(definitions)
    try:
        job = reloaded.defs.get_job_def("ingestion_job")
        cfg = job.tags["dagster-k8s/config"]
        # tags sérialisés en JSON : le relais doit contenir PAGEVIEWS_REF_SOURCE=ingested.
        assert "PAGEVIEWS_REF_SOURCE" in cfg
        assert "ingested" in cfg
    finally:
        monkeypatch.delenv("PAGEVIEWS_REF_SOURCE", raising=False)
        importlib.reload(definitions)  # restaure l'état module pour les tests suivants


# ── Dégradation propre : pas de transform_job sans assets dbt ────────────────


def test_transform_job_absent_when_dbt_degraded() -> None:
    # Sans manifest/dbt (checkout de travail, CI hermétique) : dbt_components → ([], {})
    # → transform_job N'EST PAS enregistré (sa sélection de modèles dbt ne résout rien).
    if definitions._dbt_assets:
        # Environnement avec dbt disponible : le job nominal est présent (cf. test dédié).
        assert definitions.defs.get_job_def("transform_job") is not None
    else:
        job_names = {j.name for j in definitions.defs.jobs}
        assert "transform_job" not in job_names
        assert not hasattr(definitions, "transform_job")


# ── Branche NOMINALE : transform_job enregistré quand les assets dbt existent ─


def test_transform_job_registered_when_dbt_assets_present(monkeypatch) -> None:
    # On recharge le module avec un dbt_components mocké (un asset dbt factice ciblant la clé
    # marts_views_timeline) : la branche `if _dbt_assets:` s'exécute → transform_job créé,
    # partitionné/étiqueté k8s. On restaure ensuite l'état dégradé (reload sans le patch).
    import pageviews_dagster.dbt as dbt_mod

    @asset(name="marts_views_timeline")
    def _fake_dbt_asset():  # pragma: no cover — jamais matérialisé (asset factice de test)
        return 1

    monkeypatch.setattr(dbt_mod, "dbt_components", lambda: ([_fake_dbt_asset], {"dbt": object()}))
    try:
        importlib.reload(definitions)
        job_names = {j.name for j in definitions.defs.jobs}
        assert "transform_job" in job_names
        assert hasattr(definitions, "transform_job")
        # Le job porte le câblage K8s du run (relais dbt : DBT_S3_USE_SSL / PAGEVIEWS_REF_SOURCE).
        assert "dagster-k8s/config" in definitions.transform_job.tags
    finally:
        # Restaure l'état par défaut partagé par les autres tests (reload sans le patch).
        monkeypatch.undo()
        importlib.reload(definitions)
    # Après restauration, le module reste chargeable et ingestion_job (inconditionnel) est
    # toujours présent. NB : transform_job peut aussi exister à froid car le projet dbt
    # `pageviews-dbt` est présent et parse (dbt_components() non dégradé) — on ne présume
    # donc PAS son absence ici (ce serait le cas seulement si le projet dbt était vide).
    assert "ingestion_job" in {j.name for j in definitions.defs.jobs}


# ── Câblage K8s des pods de run (piège ADR 0086) ─────────────────────────────


def test_run_env_reinjects_lineage_and_mlflow() -> None:
    # Piège contrat cluster (ADR 0086) : OPENLINEAGE_URL et MLFLOW_TRACKING_URI posés sur le
    # Deployment gRPC NE se propagent PAS aux pods de run → réinjectés ICI (sinon no-op
    # SILENCIEUX). Hosts en forme COURTE <svc>.<ns> (note DNS prod cluster#458).
    by_name = {e["name"]: e["value"] for e in definitions._RUN_ENV}
    assert by_name["OPENLINEAGE_URL"] == "http://marquez.marquez:5000"
    assert by_name["OPENLINEAGE_ENDPOINT"] == "api/v1/lineage"
    assert by_name["OPENLINEAGE_NAMESPACE"] == "dagster"
    assert by_name["MLFLOW_TRACKING_URI"] == "http://mlflow.mlflow:5000"


def test_run_k8s_config_injects_s3_secret_and_run_env() -> None:
    cfg = definitions._run_k8s_config()["dagster-k8s/config"]["container_config"]
    names = {e["name"] for e in cfg["env"]}
    assert "OPENLINEAGE_URL" in names
    assert "MLFLOW_TRACKING_URI" in names
    # Au banc / tests (PAGEVIEWS_S3_* absents) : un seul secret_ref par défaut.
    assert cfg["env_from"] == [{"secret_ref": {"name": "pageviews-s3-access"}}]


def test_no_postgres_in_run_env() -> None:
    # pageviews n'a pas d'index Postgres/pgvector (≠ citation) → aucun POSTGRES_* au run.
    names = {e["name"] for e in definitions._RUN_ENV}
    assert not any(n.startswith("POSTGRES_") for n in names)


# ── _s3_env_from (banc léger vs prod OBC) ────────────────────────────────────


def test_s3_env_from_default_bench_secret_only(monkeypatch) -> None:
    # Sans PAGEVIEWS_S3_* (banc / checkout neuf / tests) : UN secret_ref par défaut
    # (pageviews-s3-access), AUCUN config_map_ref (le Secret unique du banc porte BUCKET_*).
    monkeypatch.delenv("PAGEVIEWS_S3_SECRET", raising=False)
    monkeypatch.delenv("PAGEVIEWS_S3_CONFIGMAP", raising=False)
    assert definitions._s3_env_from() == [{"secret_ref": {"name": "pageviews-s3-access"}}]


def test_s3_env_from_prod_obc_secret_and_configmap(monkeypatch) -> None:
    # Prod (ObjectBucketClaim Rook) : Secret AWS_* ET ConfigMap BUCKET_* du nom de la claim
    # (≠ pageviews-s3-access). Les pods de RUN doivent recevoir LES DEUX (sinon BUCKET_* absent).
    monkeypatch.setenv("PAGEVIEWS_S3_SECRET", "pageviews-datalake")
    monkeypatch.setenv("PAGEVIEWS_S3_CONFIGMAP", "pageviews-datalake")
    env_from = definitions._s3_env_from()
    assert {"secret_ref": {"name": "pageviews-datalake"}} in env_from
    assert {"config_map_ref": {"name": "pageviews-datalake"}} in env_from
    assert len(env_from) == 2


def test_s3_env_from_secret_without_configmap(monkeypatch) -> None:
    # Un overlay peut renommer le Secret sans ConfigMap : config_map_ref ajouté SEULEMENT
    # si PAGEVIEWS_S3_CONFIGMAP existe.
    monkeypatch.setenv("PAGEVIEWS_S3_SECRET", "custom-s3")
    monkeypatch.delenv("PAGEVIEWS_S3_CONFIGMAP", raising=False)
    assert definitions._s3_env_from() == [{"secret_ref": {"name": "custom-s3"}}]


# ── _run_k8s_config (relais des vars d'env aux pods de run, ADR 0086) ─────────


def test_run_k8s_config_relays_dbt_env(monkeypatch) -> None:
    # Piège ADR 0086 : DBT_S3_USE_SSL (SSL dbt-duckdb) et PAGEVIEWS_REF_SOURCE (ref_source)
    # sont lues DANS le pod de run → relayées. Présentes dans l'env → relayées.
    monkeypatch.setenv("DBT_S3_USE_SSL", "true")
    monkeypatch.setenv("PAGEVIEWS_REF_SOURCE", "ingested")
    cfg = definitions._run_k8s_config()["dagster-k8s/config"]["container_config"]
    env = {e["name"]: e["value"] for e in cfg["env"]}
    assert env["DBT_S3_USE_SSL"] == "true"
    assert env["PAGEVIEWS_REF_SOURCE"] == "ingested"
    # Le run-env de base (lineage/MLflow) reste présent en plus des vars relayées.
    assert env["MLFLOW_TRACKING_URI"] == "http://mlflow.mlflow:5000"


def test_run_k8s_config_omits_absent_env(monkeypatch) -> None:
    # Au banc (vars absentes) : rien à relayer → seules les vars de base (lineage/MLflow).
    monkeypatch.delenv("DBT_S3_USE_SSL", raising=False)
    monkeypatch.delenv("PAGEVIEWS_REF_SOURCE", raising=False)
    cfg = definitions._run_k8s_config()["dagster-k8s/config"]["container_config"]
    names = {e["name"] for e in cfg["env"]}
    assert "DBT_S3_USE_SSL" not in names
    assert "PAGEVIEWS_REF_SOURCE" not in names
    # env_from S3 toujours câblé (secret par défaut au banc).
    assert cfg["env_from"] == [{"secret_ref": {"name": "pageviews-s3-access"}}]


# ── Ingestion calendaire MENSUELLE (cadence = valeur d'instance, ADR 0062) ───


def test_ingest_cron_default_when_env_absent() -> None:
    # Sans PAGEVIEWS_INGEST_CRON : défaut mensuel (le 3 du mois à 04:00 UTC) — le code ne
    # FIGE pas la cadence (exemple), il la LIT de l'instance.
    assert definitions._ingest_cron({}) == definitions._DEFAULT_INGEST_CRON == "0 4 3 * *"


def test_ingest_cron_overridable_by_instance() -> None:
    # Le déployeur fixe la cadence par env, sans toucher au code générique.
    assert definitions._ingest_cron({"PAGEVIEWS_INGEST_CRON": "0 3 1 * *"}) == "0 3 1 * *"


def test_ingest_cron_blank_falls_back_to_default() -> None:
    # Une valeur vide retombe sur le défaut (pas de cron vide qui casserait le schedule).
    got = definitions._ingest_cron({"PAGEVIEWS_INGEST_CRON": ""})
    assert got == definitions._DEFAULT_INGEST_CRON


def test_ingest_cron_reads_process_env_when_omitted(monkeypatch) -> None:
    # env=None → lecture de os.environ.
    monkeypatch.setenv("PAGEVIEWS_INGEST_CRON", "0 5 2 * *")
    assert definitions._ingest_cron() == "0 5 2 * *"


def test_ingest_monthly_schedule_registered_and_stopped() -> None:
    # Le schedule mensuel est enregistré, sur le défaut mensuel (env absent en CI), et
    # STOPPED par défaut (le code PERMET la cadence, le déployeur l'ARME — ADR 0062/0031).
    sched = next((s for s in definitions.defs.schedules if s.name == "ingest_monthly"), None)
    assert sched is not None
    assert sched.cron_schedule == definitions._DEFAULT_INGEST_CRON
    assert sched.default_status == DefaultScheduleStatus.STOPPED
    assert sched.execution_timezone == "UTC"


def test_no_sensors_registered() -> None:
    # pageviews n'a pas de sensor (pas de CT par signal à ce lot) : liste vide.
    assert list(definitions.defs.sensors) == []


def test_forecast_views_depends_on_dbt_mart_key() -> None:
    # forecast_views dépend du mart dbt marts_views_timeline (via AssetKey) : la clé pend
    # comme clé externe en mode dégradé (asset orphelin), la code-location reste chargeable.
    keys = definitions.defs.resolve_asset_graph().get_all_asset_keys()
    assert AssetKey(["marts_views_timeline"]) in keys

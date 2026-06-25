"""Tests du point d'entrée : la code-location se charge avec raw_gkg (PR 2)."""

import json

from dagster import AssetKey, Definitions

from mediawatch_dagster import definitions
from mediawatch_dagster.definitions import (
    _DEFAULT_CT_CRON,
    _DEFAULT_CT_MAX_PARTITIONS,
    _ct_cron,
    _ct_max_partitions,
    _s3_env_from,
    evaluate_ct_partitions,
    ingested_partitions,
)


def test_definitions_loads_with_raw_gkg() -> None:
    # Le serveur gRPC importe ce module : il doit être chargeable.
    assert isinstance(definitions.defs, Definitions)
    keys = list(definitions.defs.resolve_asset_graph().get_all_asset_keys())
    assert AssetKey(["raw_gkg"]) in keys


def test_ingestion_job_selects_raw_gkg() -> None:
    job = definitions.defs.get_job_def("ingestion_job")
    assert job is not None


def test_raw_gkg_is_daily_partitioned() -> None:
    # raw_gkg est partitionné par jour (la partition est le curseur, PR 4).
    keys = definitions.gkg_daily_partitions.get_partition_keys()
    # Les clés sont des dates YYYY-MM-DD ; la première est la date de départ.
    assert keys[0] == "2015-02-19"


def test_schedule_targets_current_day_partition_every_15min() -> None:
    sched = definitions.ingest_current_day
    assert sched.cron_schedule == "*/15 * * * *"
    # STOPPED par défaut : l'opérateur l'arme (pas d'ingestion silencieuse).
    from dagster import DefaultScheduleStatus

    assert sched.default_status == DefaultScheduleStatus.STOPPED


def test_run_k8s_config_injects_s3_secret_and_lineage_env() -> None:
    cfg = definitions.RUN_K8S_CONFIG["dagster-k8s/config"]["container_config"]
    # Le Secret S3 du lakehouse est injecté au niveau du RUN (pods de run). RUN_K8S_CONFIG
    # est figé à l'import : sans MEDIAWATCH_S3_* dans l'env (tests), c'est le défaut banc.
    assert cfg["env_from"] == [{"secret_ref": {"name": "mediawatch-s3-access"}}]
    # Le lineage est réinjecté au run (piège ADR 0086 : ne se propage pas du gRPC).
    names = {e["name"] for e in cfg["env"]}
    assert "OPENLINEAGE_URL" in names
    # Host en forme courte <svc>.<ns> (note DNS prod, cluster#458).
    url = next(e["value"] for e in cfg["env"] if e["name"] == "OPENLINEAGE_URL")
    assert url == "http://marquez.marquez:5000"


def test_s3_env_from_default_bench_secret_only(monkeypatch) -> None:
    # Sans MEDIAWATCH_S3_* (banc / checkout neuf / tests) : un seul secret_ref par
    # défaut (mediawatch-s3-access), AUCUN config_map_ref (le Secret unique du banc
    # porte déjà BUCKET_*).
    monkeypatch.delenv("MEDIAWATCH_S3_SECRET", raising=False)
    monkeypatch.delenv("MEDIAWATCH_S3_CONFIGMAP", raising=False)
    assert _s3_env_from() == [{"secret_ref": {"name": "mediawatch-s3-access"}}]


def test_s3_env_from_prod_obc_secret_and_configmap(monkeypatch) -> None:
    # Prod (ObjectBucketClaim Rook) : le Secret AWS_* ET le ConfigMap BUCKET_* sont
    # tous deux du nom de la claim. Les pods de RUN doivent recevoir LES DEUX (le
    # ConfigMap est requis en prod, sinon BUCKET_* absent). C'est le bug que le nom
    # codé en dur masquait : l'OBC ne crée pas `mediawatch-s3-access` en prod.
    monkeypatch.setenv("MEDIAWATCH_S3_SECRET", "mediawatch-datalake")
    monkeypatch.setenv("MEDIAWATCH_S3_CONFIGMAP", "mediawatch-datalake")
    env_from = _s3_env_from()
    assert {"secret_ref": {"name": "mediawatch-datalake"}} in env_from
    assert {"config_map_ref": {"name": "mediawatch-datalake"}} in env_from
    assert len(env_from) == 2


def test_s3_env_from_secret_without_configmap(monkeypatch) -> None:
    # Un overlay peut renommer le Secret sans déclarer de ConfigMap : on n'ajoute
    # config_map_ref QUE si MEDIAWATCH_S3_CONFIGMAP existe.
    monkeypatch.setenv("MEDIAWATCH_S3_SECRET", "custom-s3")
    monkeypatch.delenv("MEDIAWATCH_S3_CONFIGMAP", raising=False)
    assert _s3_env_from() == [{"secret_ref": {"name": "custom-s3"}}]


def test_transform_run_config_relays_dbt_env(monkeypatch) -> None:
    # Piège ADR 0086 : les vars de l'overlay (DBT_S3_USE_SSL, MEDIAWATCH_REF_SOURCE)
    # doivent être relayées aux pods de run. Présentes dans l'env → relayées.
    monkeypatch.setenv("DBT_S3_USE_SSL", "true")
    monkeypatch.setenv("MEDIAWATCH_REF_SOURCE", "ingested")
    cfg = definitions._transform_run_config()["dagster-k8s/config"]["container_config"]
    env = {e["name"]: e["value"] for e in cfg["env"]}
    assert env["DBT_S3_USE_SSL"] == "true"
    assert env["MEDIAWATCH_REF_SOURCE"] == "ingested"


def test_transform_run_config_omits_absent_env(monkeypatch) -> None:
    monkeypatch.delenv("DBT_S3_USE_SSL", raising=False)
    monkeypatch.delenv("MEDIAWATCH_REF_SOURCE", raising=False)
    cfg = definitions._transform_run_config()["dagster-k8s/config"]["container_config"]
    names = {e["name"] for e in cfg["env"]}
    # Au banc (vars absentes), rien à relayer → seules les vars de base présentes.
    assert "DBT_S3_USE_SSL" not in names
    assert "MEDIAWATCH_REF_SOURCE" not in names


def test_no_mlflow_or_postgres_env_in_v1() -> None:
    # Périmètre v1 « articles seulement » : pas de MLflow ni d'index Postgres.
    names = {
        e["name"]
        for e in definitions.RUN_K8S_CONFIG["dagster-k8s/config"]["container_config"]["env"]
    }
    assert not any(n.startswith("POSTGRES_") for n in names)
    assert "MLFLOW_TRACKING_URI" not in names


# ── Entraînement continu (CT, ADR 0062) ──────────────────────────────────────


def test_ingested_partitions_extracts_distinct_dates() -> None:
    # Un dt= peut apparaître plusieurs fois (dossier + run= + fichiers) : on déduplique.
    entries = [
        {"Path": "dt=2026-06-23", "IsDir": True},
        {"Path": "dt=2026-06-23/run=abc", "IsDir": True},
        {"Path": "dt=2026-06-24/run=def", "IsDir": True},
    ]
    assert ingested_partitions(entries) == {"2026-06-23", "2026-06-24"}


def test_ingested_partitions_ignores_nonconforming_paths() -> None:
    # Un chemin sans dt= conforme (ou date malformée) est ignoré, pas une erreur.
    entries = [
        {"Path": "something/else"},
        {"Path": "dt=not-a-date/run=x"},
        {"Path": "dt=2026-06-25/run=ghi"},
    ]
    assert ingested_partitions(entries) == {"2026-06-25"}


def test_evaluate_ct_partitions_bootstrap_triggers_all() -> None:
    # Premier tick (curseur None) et partitions présentes → on lance, curseur = état trié.
    to_run, cursor = evaluate_ct_partitions({"2026-06-24", "2026-06-23"}, None, 7)
    assert to_run == ["2026-06-23", "2026-06-24"]  # chronologique
    assert cursor == json.dumps(["2026-06-23", "2026-06-24"])


def test_evaluate_ct_partitions_unchanged_skips() -> None:
    # État identique au curseur → rien à relancer (dédup, pas de double-run).
    cursor = json.dumps(["2026-06-23", "2026-06-24"])
    to_run, new_cursor = evaluate_ct_partitions({"2026-06-23", "2026-06-24"}, cursor, 7)
    assert to_run == []
    assert new_cursor == cursor


def test_evaluate_ct_partitions_advance_triggers_only_new() -> None:
    # Une partition neuve apparaît → on ne lance QUE la nouvelle (pas les anciennes).
    cursor = json.dumps(["2026-06-23", "2026-06-24"])
    to_run, _ = evaluate_ct_partitions({"2026-06-23", "2026-06-24", "2026-06-25"}, cursor, 7)
    assert to_run == ["2026-06-25"]


def test_evaluate_ct_partitions_caps_to_n_most_recent() -> None:
    # Backfill : 10 partitions neuves d'un coup, borne 3 → les 3 PLUS RÉCENTES seules,
    # rendues en ordre chronologique. Le reste suivra aux ticks d'après (anti-rafale).
    many = {f"2026-06-{day:02d}" for day in range(1, 11)}
    to_run, _ = evaluate_ct_partitions(many, None, 3)
    assert to_run == ["2026-06-08", "2026-06-09", "2026-06-10"]


def test_evaluate_ct_partitions_empty_skips() -> None:
    # Aucune partition ingérée (bootstrap à vide) → rien à transformer.
    to_run, cursor = evaluate_ct_partitions(set(), None, 7)
    assert to_run == []
    assert cursor == json.dumps([])


def test_evaluate_ct_partitions_cursor_is_deterministic() -> None:
    # Le curseur est une liste TRIÉE : un même état (ordre d'itération du set quelconque)
    # produit toujours le même sérialisé → pas de re-déclenchement parasite.
    _, cursor_a = evaluate_ct_partitions({"2026-06-24", "2026-06-23"}, None, 7)
    _, cursor_b = evaluate_ct_partitions({"2026-06-23", "2026-06-24"}, None, 7)
    assert cursor_a == cursor_b


def test_ct_cron_default_when_env_absent() -> None:
    # Sans MEDIAWATCH_CT_CRON : défaut quotidien (exemple) — le code ne fige PAS la cadence.
    assert _ct_cron({}) == _DEFAULT_CT_CRON


def test_ct_cron_overridable_by_instance() -> None:
    # Le déployeur fixe la cadence (ex. mensuel) par env, sans toucher au code générique.
    assert _ct_cron({"MEDIAWATCH_CT_CRON": "0 3 1 * *"}) == "0 3 1 * *"


def test_ct_cron_blank_falls_back_to_default() -> None:
    # Une valeur vide retombe sur le défaut (pas de cron vide qui casserait le schedule).
    assert _ct_cron({"MEDIAWATCH_CT_CRON": ""}) == _DEFAULT_CT_CRON


def test_ct_max_partitions_default_when_env_absent() -> None:
    assert _ct_max_partitions({}) == _DEFAULT_CT_MAX_PARTITIONS


def test_ct_max_partitions_overridable_by_instance() -> None:
    assert _ct_max_partitions({"MEDIAWATCH_CT_MAX_PARTITIONS_PER_TICK": "20"}) == 20


def test_ct_max_partitions_invalid_falls_back_to_default() -> None:
    # Valeur non entière ou ≤ 0 → défaut (pas de borne nulle/négative qui bloquerait le CT).
    assert _ct_max_partitions({"MEDIAWATCH_CT_MAX_PARTITIONS_PER_TICK": "x"}) == (
        _DEFAULT_CT_MAX_PARTITIONS
    )
    assert _ct_max_partitions({"MEDIAWATCH_CT_MAX_PARTITIONS_PER_TICK": "0"}) == (
        _DEFAULT_CT_MAX_PARTITIONS
    )


def test_transform_daily_schedule_registered_and_stopped() -> None:
    # Le CT calendaire est enregistré (manifest dbt packagé) et STOPPED par défaut
    # (le code PERMET, le déployeur ARME — ADR 0062/0031).
    from dagster import DefaultScheduleStatus

    sched = next((s for s in definitions.defs.schedules if s.name == "transform_daily"), None)
    assert sched is not None
    assert sched.cron_schedule == _DEFAULT_CT_CRON  # défaut en CI (env absent)
    assert sched.default_status == DefaultScheduleStatus.STOPPED


def test_transform_daily_emits_partition_key() -> None:
    # Piège ≠ citation : transform_job est PARTITIONNÉ → le RunRequest DOIT porter une
    # partition_key (l'omettre ferait échouer le run). On vérifie qu'il en émet une.
    from datetime import datetime, timezone

    from dagster import build_schedule_context

    sched = next(s for s in definitions.defs.schedules if s.name == "transform_daily")
    ctx = build_schedule_context(
        scheduled_execution_time=datetime(2026, 6, 25, 3, 0, tzinfo=timezone.utc)
    )
    run_request = sched(ctx)
    assert run_request.partition_key == "2026-06-25"


def test_ct_sensor_registered_and_stopped() -> None:
    # Le CT par signal est enregistré (manifest dbt packagé) et STOPPED par défaut.
    from dagster import DefaultSensorStatus

    sensor_def = next(
        (s for s in definitions.defs.sensors if s.name == "transform_on_ingestion_advance"),
        None,
    )
    assert sensor_def is not None
    assert sensor_def.default_status == DefaultSensorStatus.STOPPED

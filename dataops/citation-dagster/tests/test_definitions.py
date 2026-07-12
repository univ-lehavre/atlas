"""Tests du point d'entrée de la code-location (definitions)."""

import json

from citation_dagster.definitions import (
    _DEFAULT_CT_CRON,
    _DEFAULT_INGEST_CRON,
    _DEFAULT_RETRAIN_COOLDOWN_S,
    _DNS_NDOTS_1,
    _RUN_K8S_CONFIG,
    _TRANSFORM_K8S_CONFIG,
    _ct_cron,
    _ingest_cron,
    _ingest_run_config,
    _mode_bounds,
    _retrain_auto_enabled,
    _retrain_cooldown_s,
    _s3_env_from,
    defs,
    evaluate_ct_sensor,
    evaluate_drift_retrain,
    ingestion_job,
)


def _run_container_config(job):
    """container_config des tags dagster-k8s/config d'un job (valeur dict ou JSON)."""
    raw = job.tags["dagster-k8s/config"]
    config = raw if isinstance(raw, dict) else json.loads(raw)
    return config["container_config"]


def _run_pod_spec_config(job):
    """pod_spec_config des tags dagster-k8s/config d'un job (valeur dict ou JSON)."""
    raw = job.tags["dagster-k8s/config"]
    config = raw if isinstance(raw, dict) else json.loads(raw)
    return config["pod_spec_config"]


def test_ingestion_run_pod_sets_ndots_1():
    # ndots:1 sur le pod de run tue le fan-out de search-list (piège FQDN prod sous charge,
    # cluster#458) : sans lui, un host intra-cluster à < 5 points déclenche 5-6 lookups par
    # HEAD → EAI_AGAIN transitoires sur les milliers de HEAD du contrat GE.
    dns = _run_pod_spec_config(ingestion_job)["dns_config"]
    assert {"name": "ndots", "value": "1"} in dns["options"]


def test_transform_run_pod_sets_ndots_1():
    # Même dnsConfig sur le transform (dbt-duckdb + index_load résolvent RGW et pg par nom court).
    dns = _TRANSFORM_K8S_CONFIG["dagster-k8s/config"]["pod_spec_config"]["dns_config"]
    assert {"name": "ndots", "value": "1"} in dns["options"]


def test_dns_ndots_config_is_consistent_across_jobs():
    # Parité : ingestion et transform portent le MÊME dnsConfig (le pod_spec_config contient
    # AUSSI le volume de spilling → on compare le sous-dict dns_config, pas l'égalité totale).
    ing = _run_pod_spec_config(ingestion_job)
    tr = _TRANSFORM_K8S_CONFIG["dagster-k8s/config"]["pod_spec_config"]
    assert ing["dns_config"] == _DNS_NDOTS_1["dns_config"]
    assert tr["dns_config"] == _DNS_NDOTS_1["dns_config"]


def test_run_pod_mounts_duckdb_spill_volume():
    # Scalabilité : un emptyDir de spilling DuckDB est monté sur les pods de run (ingestion ET
    # transform) → les gros tris/jointures curated débordent sur disque au lieu d'OOM.
    for cfg in (_RUN_K8S_CONFIG, _TRANSFORM_K8S_CONFIG):
        k = cfg["dagster-k8s/config"]
        vols = k["pod_spec_config"]["volumes"]
        mounts = k["container_config"]["volume_mounts"]
        assert any(v.get("empty_dir") is not None and v["name"] == "duckdb-spill" for v in vols)
        assert any(m["mount_path"] == "/tmp/duckdb-spill" for m in mounts)


def test_run_pod_declares_resources_coherent_with_duckdb():
    # Le pod de run RÉSERVE des resources cohérentes avec DuckDB (fin du BestEffort qui OOMait).
    # Invariant CRITIQUE : la limite mémoire pod (56Gi) doit être > memory_limit DuckDB (24GB)
    # → DuckDB spille sur disque AVANT que le cgroup ne tue le pod. L'ÉCART (pod − DuckDB) est la
    # RAM hors-DuckDB des assets numpy purs (pair_uplift_model) : portée à 56Gi (drift L91) car
    # 28Gi ne laissait que ~4Gi, insuffisant pour le pic ~10Gi à l'échelle réelle (242k auteurs).
    for cfg in (_RUN_K8S_CONFIG, _TRANSFORM_K8S_CONFIG):
        res = cfg["dagster-k8s/config"]["container_config"]["resources"]
        assert res["requests"]["cpu"] and res["requests"]["memory"]
        assert res["limits"]["cpu"] == "32"  # = threads DuckDB (ADR 0094 : lots ~5M works)
        assert res["limits"]["memory"] == "56Gi"
        # Invariant robuste : la limite pod (Gi) DOIT dépasser le memory_limit DuckDB (24 GB) pour
        # que le spill précède l'OOM cgroup — quelle que soit la valeur exacte.
        pod_gib = int(res["limits"]["memory"].removesuffix("Gi"))
        assert pod_gib * 2**30 > 24 * 10**9


def test_defs_exposes_raw_snapshot_asset():
    keys = {k.to_user_string() for k in defs.resolve_asset_graph().get_all_asset_keys()}
    assert "raw_snapshot" in keys


def test_ingestion_job_injects_s3_secret_into_run_pod():
    # Les tags k8s au niveau run propagent le Secret S3 au pod de run.
    # Dagster sérialise la valeur du tag en chaîne JSON. Sans env d'overlay, le
    # défaut est le Secret unique du banc (citation-s3-access), sans ConfigMap.
    env_from = _run_container_config(ingestion_job)["env_from"]
    assert {"secret_ref": {"name": "citation-s3-access"}} in env_from


def test_s3_env_from_default_bench_secret_only(monkeypatch):
    # Sans CITATION_S3_* (banc / checkout neuf / tests) : un seul secret_ref par
    # défaut (citation-s3-access), AUCUN config_map_ref (le Secret unique du banc
    # porte déjà BUCKET_*).
    monkeypatch.delenv("CITATION_S3_SECRET", raising=False)
    monkeypatch.delenv("CITATION_S3_CONFIGMAP", raising=False)
    env_from = _s3_env_from()
    assert env_from == [{"secret_ref": {"name": "citation-s3-access"}}]


def test_s3_env_from_prod_obc_secret_and_configmap(monkeypatch):
    # Prod (ObjectBucketClaim Rook) : le Secret AWS_* ET le ConfigMap BUCKET_* sont
    # tous deux du nom de la claim. Les pods de RUN doivent recevoir LES DEUX (le
    # ConfigMap est requis en prod, à la différence du banc) — sinon BUCKET_* absent.
    monkeypatch.setenv("CITATION_S3_SECRET", "citation-datalake")
    monkeypatch.setenv("CITATION_S3_CONFIGMAP", "citation-datalake")
    env_from = _s3_env_from()
    assert {"secret_ref": {"name": "citation-datalake"}} in env_from
    assert {"config_map_ref": {"name": "citation-datalake"}} in env_from
    assert len(env_from) == 2


def test_s3_env_from_secret_without_configmap(monkeypatch):
    # Un overlay peut renommer le Secret sans déclarer de ConfigMap (ex. banc à
    # creds custom) : on n'ajoute config_map_ref QUE si CITATION_S3_CONFIGMAP existe.
    monkeypatch.setenv("CITATION_S3_SECRET", "custom-s3")
    monkeypatch.delenv("CITATION_S3_CONFIGMAP", raising=False)
    env_from = _s3_env_from()
    assert env_from == [{"secret_ref": {"name": "custom-s3"}}]


def test_ingestion_job_injects_lineage_and_mlflow_env_into_run_pod():
    # Piège ADR 0086 : OPENLINEAGE_URL / MLFLOW_TRACKING_URI doivent atteindre le
    # POD DE RUN (pas seulement la code-location), sinon lineage + MLflow no-op
    # silencieux. On vérifie qu'ils sont déclarés au niveau run.
    env = _run_container_config(ingestion_job)["env"]
    names = {e["name"] for e in env}
    assert "OPENLINEAGE_URL" in names
    assert "MLFLOW_TRACKING_URI" in names


def test_ingest_run_config_prod_default_is_unbounded():
    """PROD : aucune variable de bornage posée → pas de run_config → défaut CODE complet.

    C'est le cœur de la révision : la prod ne borne PAS l'ingestion (elle rapatrie tout),
    et c'est le banc qui pose les variables. Sans env → None (aucune surcharge)."""
    assert _ingest_run_config({}) is None


def test_ingest_run_config_bench_bounds_from_env():
    """BANC : les variables d'overlay bornent l'ingestion via le run_config de la Schedule."""
    env = {
        "CITATION_INGEST_SAMPLE_SIZE": "4",
        "CITATION_INGEST_MAX_PARTITIONS": "1",
    }
    rc = _ingest_run_config(env)
    assert rc is not None
    cfg = rc.ops["raw_snapshot"]
    assert cfg.sample_size == 4
    assert cfg.max_partitions == 1


def test_ingest_run_config_ignores_malformed_env():
    """Parse défensif : une valeur invalide n'écrase PAS le défaut complet (pas de crash)."""
    rc = _ingest_run_config({"CITATION_INGEST_MAX_PARTITIONS": "pas-un-entier"})
    # rien de valide → aucune surcharge → None (défaut complet préservé).
    assert rc is None


def test_mode_bounds_full_and_unknown_are_empty():
    """persistence.mode (ADR 0102) : full / absent / inconnu / vide → aucune borne ({})."""
    assert _mode_bounds({}) == {}  # absent → défaut full
    assert _mode_bounds({"CITATION_INGEST_PERSISTENCE_MODE": "full"}) == {}
    assert _mode_bounds({"CITATION_INGEST_PERSISTENCE_MODE": "FULL"}) == {}  # insensible casse
    assert _mode_bounds({"CITATION_INGEST_PERSISTENCE_MODE": "typo"}) == {}  # défensif
    assert _mode_bounds({"CITATION_INGEST_PERSISTENCE_MODE": "  "}) == {}  # vide/espaces


def test_mode_bounds_bounded_and_ephemeral():
    """persistence.mode : bounded et ephemeral préréglent des bornes finies (ADR 0102)."""
    assert _mode_bounds({"CITATION_INGEST_PERSISTENCE_MODE": "bounded"}) == {
        "sample_size": 50,
        "max_partitions": 6,
    }
    assert _mode_bounds({"CITATION_INGEST_PERSISTENCE_MODE": "ephemeral"}) == {
        "sample_size": 4,
        "max_partitions": 1,
    }


def test_ingest_run_config_full_mode_is_byte_identity_none():
    """INVARIANT ZÉRO-RÉGRESSION (ADR 0102) : full (explicite ou par défaut) → None.

    Le mode ``full`` ne pose aucune borne → ``overrides`` vide → run_config ``None``,
    littéralement le même objet qu'aujourd'hui (pas un RunConfig(sample_size=0))."""
    assert _ingest_run_config({"CITATION_INGEST_PERSISTENCE_MODE": "full"}) is None
    assert _ingest_run_config({"CITATION_INGEST_PERSISTENCE_MODE": "typo"}) is None


def test_ingest_run_config_bounded_mode_preregles_bornes():
    """Le mode bounded prérègle les bornes d'ingestion sans variable explicite (ADR 0102)."""
    rc = _ingest_run_config({"CITATION_INGEST_PERSISTENCE_MODE": "bounded"})
    assert rc is not None
    cfg = rc.ops["raw_snapshot"]
    assert cfg.sample_size == 50
    assert cfg.max_partitions == 6


def test_ingest_run_config_explicit_env_wins_over_mode():
    """Préséance (ADR 0102) : une variable explicite écrase le préréglage du mode."""
    rc = _ingest_run_config(
        {
            "CITATION_INGEST_PERSISTENCE_MODE": "ephemeral",  # prérègle 4/1
            "CITATION_INGEST_SAMPLE_SIZE": "9",  # explicite → gagne
        }
    )
    assert rc is not None
    cfg = rc.ops["raw_snapshot"]
    assert cfg.sample_size == 9  # variable explicite l'emporte
    assert cfg.max_partitions == 1  # non surchargée → reste celle du mode


def test_ingest_schedule_registered_on_ingestion_job():
    """La Schedule ingest_snapshot existe et cible ingestion_job. Son run_config (câblé
    via _ingest_run_config, testé ci-dessus) borne le banc et laisse la prod complète."""
    from citation_dagster import definitions as d

    sched = next(s for s in d._schedules if s.name == "ingest_snapshot")
    assert sched.job_name == "ingestion_job"


def _job_by_name(name):
    from citation_dagster.definitions import defs

    return defs.get_job_def(name)


def test_transform_job_injects_all_postgres_env_into_run_pod():
    # RÉGRESSION (cluster#458 audit) : index_load (transform_job) appelle
    # postgres_target_from_env qui EXIGE POSTGRES_HOST/DB/USER/PASSWORD ; ils DOIVENT
    # atteindre le pod de run. L'ancien `env_from: pg-role-pgvector` brut ne fournissait
    # ni ces noms (clés username/password) ni le bon namespace → MissingEnvError au run.
    cfg = _run_container_config(_job_by_name("transform_job"))
    env = {e["name"]: e for e in cfg["env"]}
    # host/db/port en littéraux NOM COURT (note DNS du contrat, cluster#458).
    assert env["POSTGRES_HOST"]["value"] == "pg-rw.postgres"  # pas le FQDN
    assert env["POSTGRES_DB"]["value"] == "pgvector"
    assert env["POSTGRES_PORT"]["value"] == "5432"
    # user/password via secretKeyRef vers le dérivé pgvector-pg-auth (ns dagster).
    for var, key in (("POSTGRES_USER", "username"), ("POSTGRES_PASSWORD", "password")):
        ref = env[var]["value_from"]["secret_key_ref"]
        assert ref == {"name": "pgvector-pg-auth", "key": key}
    # on n'injecte PLUS le Secret brut pg-role-pgvector (mauvaises clés + mauvais ns).
    assert {"secret_ref": {"name": "pg-role-pgvector"}} not in cfg.get("env_from", [])
    # Piège ADR 0086 (régression) : pair_uplift_model tourne dans transform_job et
    # logge MLflow + émet du lineage → ces deux vars DOIVENT atteindre le pod de run,
    # sinon observabilité no-op silencieuse. (Couverture symétrique à ingestion_job.)
    assert "OPENLINEAGE_URL" in env
    assert "MLFLOW_TRACKING_URI" in env


# ── CT par signal : @sensor watermark → transform_job (atlas#399) ─────────────


def test_ct_sensor_registered_when_dbt_present():
    # En présence des assets dbt (manifest packagé), le sensor de CT est enregistré.
    names = {s.name for s in defs.sensors}
    assert "transform_on_watermark_advance" in names


def test_ct_sensor_stopped_by_default():
    # Le code PERMET, le déployeur ARME (ADR 0062/0031) : sensor STOPPED par défaut.
    from dagster import DefaultSensorStatus

    s = next(s for s in defs.sensors if s.name == "transform_on_watermark_advance")
    assert s.default_status == DefaultSensorStatus.STOPPED


def test_evaluate_ct_sensor_first_state_triggers():
    # Premier watermark observé (curseur None) et non vide → déclenche, curseur = état.
    state = {"works": "2024-01-05", "authors": "2024-01-04"}
    should_run, run_key, new_cursor = evaluate_ct_sensor(state, None)
    assert should_run is True
    assert run_key == new_cursor == json.dumps(state, sort_keys=True)


def test_evaluate_ct_sensor_unchanged_skips():
    # État identique au curseur → pas de re-déclenchement (dédup, pas de double-run).
    state = {"works": "2024-01-05"}
    cursor = json.dumps(state, sort_keys=True)
    should_run, run_key, new_cursor = evaluate_ct_sensor(state, cursor)
    assert should_run is False
    assert new_cursor == cursor


def test_evaluate_ct_sensor_advance_triggers_new_run_key():
    # Le watermark avance → déclenche, et le run_key CHANGE (Dagster ne dédupe pas l'ancien).
    old = {"works": "2024-01-05"}
    cursor = json.dumps(old, sort_keys=True)
    new = {"works": "2024-02-10"}
    should_run, run_key, _ = evaluate_ct_sensor(new, cursor)
    assert should_run is True
    assert run_key == json.dumps(new, sort_keys=True)
    assert run_key != cursor


def test_evaluate_ct_sensor_empty_state_skips():
    # Watermark vide (aucune ingestion encore) → rien à réentraîner, pas de déclenchement.
    should_run, _, new_cursor = evaluate_ct_sensor({}, None)
    assert should_run is False
    assert new_cursor == json.dumps({}, sort_keys=True)


def test_evaluate_ct_sensor_key_order_insensitive():
    # Le sérialisé est trié → un même état à clés permutées ne re-déclenche pas (déterminisme).
    cursor = json.dumps({"authors": "2024-01-04", "works": "2024-01-05"}, sort_keys=True)
    should_run, _, _ = evaluate_ct_sensor({"works": "2024-01-05", "authors": "2024-01-04"}, cursor)
    assert should_run is False


# ── Cadence du CT = valeur d'instance (ADR 0062, atlas#399) ───────────────────


def test_ct_cron_default_when_env_absent():
    # Sans CITATION_CT_CRON : défaut quotidien (exemple) — le code ne fige PAS la cadence.
    assert _ct_cron({}) == _DEFAULT_CT_CRON


def test_ct_cron_overridable_by_instance():
    # Le déployeur fixe la cadence (ex. mensuel) par env, sans toucher au code générique.
    assert _ct_cron({"CITATION_CT_CRON": "0 2 1 * *"}) == "0 2 1 * *"


def test_ct_cron_blank_falls_back_to_default():
    # Une valeur vide retombe sur le défaut (pas de cron vide qui casserait le schedule).
    assert _ct_cron({"CITATION_CT_CRON": ""}) == _DEFAULT_CT_CRON


def test_transform_daily_uses_default_cron_in_ci():
    # En CI (env absent), le schedule enregistré porte bien le cron par défaut.
    sched = next((s for s in defs.schedules if s.name == "transform_daily"), None)
    assert sched is not None
    assert sched.cron_schedule == _DEFAULT_CT_CRON


def test_ingest_cron_default_when_env_absent():
    # Sans CITATION_INGEST_CRON : défaut mensuel (rythme OpenAlex) — cadence non figée.
    assert _ingest_cron({}) == _DEFAULT_INGEST_CRON


def test_ingest_cron_overridable_by_instance():
    # Le déployeur change la cadence d'ingestion par env, sans toucher au code générique.
    assert _ingest_cron({"CITATION_INGEST_CRON": "0 3 15 * *"}) == "0 3 15 * *"


def test_ingest_cron_blank_falls_back_to_default():
    # Une valeur vide retombe sur le défaut (pas de cron vide qui casserait le schedule).
    assert _ingest_cron({"CITATION_INGEST_CRON": ""}) == _DEFAULT_INGEST_CRON


def test_ingest_snapshot_registered_unconditionally_and_targets_ingestion_job():
    # Le schedule d'ingestion existe INCONDITIONNELLEMENT (pas gardé par _dbt_assets),
    # cible ingestion_job et porte le cron par défaut en CI.
    sched = next((s for s in defs.schedules if s.name == "ingest_snapshot"), None)
    assert sched is not None
    assert sched.cron_schedule == _DEFAULT_INGEST_CRON
    assert sched.job_name == ingestion_job.name


# ── Boucle fermée dérive → réentraînement (CT autonome, ADR 0079) ────────────────────


def _verdict(run_id, detected, wm, schema=1):
    return {
        "schema_version": schema,
        "run_id": run_id,
        "drift_detected": detected,
        "watermark": wm,
    }


_WM1 = {"works": "2024-01-05"}
_WM2 = {"works": "2024-02-10"}


def test_drift_retrain_bootstrap_drift_triggers():
    # 1er verdict (curseur None), drift + watermark non vide → réentraîne.
    should, key, _ = evaluate_drift_retrain(_verdict("run2", True, _WM1), None, True)
    assert should is True
    assert key == "drift-retrain:run2"


def test_drift_retrain_same_verdict_dedup():
    # Même verdict rejoué (même run_id) → pas de second retrain (dédup).
    _, _, cursor = evaluate_drift_retrain(_verdict("run2", True, _WM1), None, True)
    should, _, _ = evaluate_drift_retrain(_verdict("run2", True, _WM1), cursor, True)
    assert should is False


def test_drift_retrain_post_retrain_same_watermark_terminates():
    # TERMINAISON : le run post-retrain a un nouveau run_id mais le MÊME watermark
    # (le retrain n'a pas ré-ingéré) → SKIP. Point fixe en 1 itération (anti-emballement).
    _, _, cursor = evaluate_drift_retrain(_verdict("run2", True, _WM1), None, True)
    should, _, _ = evaluate_drift_retrain(_verdict("run3", True, _WM1), cursor, True)
    assert should is False


def test_drift_retrain_new_data_triggers_again():
    # Après un retrain, un drift sur une donnée VRAIMENT neuve (watermark avancé) relance.
    _, _, cursor = evaluate_drift_retrain(_verdict("run2", True, _WM1), None, True)
    should, key, _ = evaluate_drift_retrain(_verdict("run4", True, _WM2), cursor, True)
    assert should is True
    assert key == "drift-retrain:run4"


def test_drift_retrain_no_drift_skips():
    should, _, _ = evaluate_drift_retrain(_verdict("run5", False, _WM2), None, True)
    assert should is False


def test_drift_retrain_cooldown_blocks():
    # Drift + donnée neuve mais cooldown KO → SKIP (anti-flapping).
    should, _, _ = evaluate_drift_retrain(_verdict("run6", True, _WM1), None, False)
    assert should is False


def test_drift_retrain_unknown_schema_skips():
    # Verdict sans schema_version=1 (ancien/corrompu) → SKIP prudent.
    bad = {"run_id": "x", "drift_detected": True, "watermark": _WM1}
    should, _, _ = evaluate_drift_retrain(bad, None, True)
    assert should is False


def test_drift_retrain_empty_verdict_skips():
    # Verdict vide (bootstrap, pas encore de mesure) → SKIP.
    should, _, _ = evaluate_drift_retrain({}, None, True)
    assert should is False


def test_drift_retrain_cursor_advances_run_on_skip():
    # Sur un SKIP (pas de drift), le curseur mémorise quand même le run_id vu (dédup futur),
    # sans avancer last_retrain_watermark (seul un retrain effectif l'avance).
    _, _, cursor = evaluate_drift_retrain(_verdict("run5", False, _WM2), None, True)
    state = json.loads(cursor)
    assert state["last_verdict_run"] == "run5"
    assert state["last_retrain_watermark"] is None


def test_retrain_auto_enabled_default_on():
    assert _retrain_auto_enabled({}) is True


def test_retrain_auto_opt_out_values():
    for v in ("off", "0", "false", "no", "OFF", " Off "):
        assert _retrain_auto_enabled({"CITATION_RETRAIN_AUTO": v}) is False
    assert _retrain_auto_enabled({"CITATION_RETRAIN_AUTO": "on"}) is True


def test_retrain_cooldown_default_and_override():
    assert _retrain_cooldown_s({}) == _DEFAULT_RETRAIN_COOLDOWN_S
    assert _retrain_cooldown_s({"CITATION_RETRAIN_COOLDOWN_S": "120"}) == 120
    assert _retrain_cooldown_s({"CITATION_RETRAIN_COOLDOWN_S": "x"}) == _DEFAULT_RETRAIN_COOLDOWN_S
    assert _retrain_cooldown_s({"CITATION_RETRAIN_COOLDOWN_S": "-5"}) == _DEFAULT_RETRAIN_COOLDOWN_S


def test_retrain_sensor_running_by_default():
    # Le sensor de boucle est ACTIF par défaut (rupture ADR 0079) ; le watermark-sensor
    # reste STOPPED. (defs est construit avec CITATION_RETRAIN_AUTO non posé → défaut on.)
    from dagster import DefaultSensorStatus

    by_name = {s.name: s.default_status for s in defs.sensors}
    assert by_name.get("retrain_on_drift") == DefaultSensorStatus.RUNNING
    assert by_name.get("transform_on_watermark_advance") == DefaultSensorStatus.STOPPED

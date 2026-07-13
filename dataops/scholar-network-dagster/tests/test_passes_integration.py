"""Tests d'INTÉGRATION des passes 1 et 2 sur MinIO (ADR 0103 §1.2/§1.3, lots 3-4).

Prouve la sémantique fine sur des ``authorships`` imbriqués réels (structs
``{author:{id}, institutions:[{ror}]}``), impossible à couvrir en pur :

- **Passe 1** : GRAIN AUTEUR — un co-auteur NON affilié EUNICoast d'un work EUNICoast
  n'entre PAS dans la table (seul l'auteur affilié est « identifié »).
- **Passe 2** : ÉLARGISSEMENT — un work co-écrit par un chercheur identifié est retenu
  MÊME SANS affiliation EUNICoast sur ce work.

S'auto-saute sans Docker.
"""

from scholar_network_dagster.assets.passes import (
    RESEARCHERS_SUBDIR,
    researchers,
    researchers_glob,
    researchers_sql,
    scholar_works,
    scholar_works_sql,
)
from scholar_network_dagster.lakehouse import connect
from scholar_network_dagster.resources import DuckDBS3Config

# ROR du référentiel (Le Havre) et un ROR EXTERNE (hors EUNICoast) pour le co-auteur.
_EUNI_ROR = "https://ror.org/05v509s40"  # Le Havre (dans le seed)
_EXT_ROR = "https://ror.org/042nb2s44"  # MIT — hors EUNICoast

# topics/keywords : listes vides typées (les colonnes projetées doivent exister pour que
# prefilter_sql — chemin ephemeral — les retrouve ; une vraie source OpenAlex les porte).
_EMPTY = "[]::STRUCT(display_name VARCHAR)[]"


def _duckdb_cfg(minio) -> DuckDBS3Config:
    return DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )


def _seed_prefiltered(con, bucket: str) -> str:
    """Écrit un brut pré-filtré synthétique avec authorships imbriqués ; renvoie son glob.

    - W1 : work EUNICoast — auteur A1 affilié Le Havre + co-auteur A2 affilié MIT (externe).
    - W2 : work SANS affiliation EUNICoast — co-auteurs A2 (MIT) et A3 (MIT). Aucun membre.
    Attendu passe 1 : {A1} seulement (A2/A3 non affiliés EUNICoast). W1 prouve le grain auteur.
    """
    dest = f"s3://{bucket}/prefiltered/part-00000.parquet"
    # authorships : liste de structs {author: {id}, institutions: [{ror}]}.
    con.execute(
        f"""
        COPY (
            SELECT * FROM (VALUES
                (
                    'W1', 2020, 'article', 't1', {_EMPTY}, {_EMPTY}, 1.0, 5, DATE '2021-01-01',
                    [
                        {{'author': {{'id': 'A1'}}, 'institutions': [{{'ror': '{_EUNI_ROR}'}}]}},
                        {{'author': {{'id': 'A2'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}}
                    ]
                ),
                (
                    'W2', 2021, 'article', 't2', {_EMPTY}, {_EMPTY}, 1.0, 3, DATE '2022-01-01',
                    [
                        {{'author': {{'id': 'A2'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}},
                        {{'author': {{'id': 'A3'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}}
                    ]
                )
            ) AS t(id, publication_year, type, title, topics, keywords,
                   fwci, cited_by_count, updated_date, authorships)
        ) TO '{dest}' (FORMAT PARQUET)
        """
    )
    return f"s3://{bucket}/prefiltered/*.parquet"


def test_pass1_is_author_grained_excludes_external_coauthor(minio):
    """Passe 1 : seul l'auteur AFFILIÉ EUNICoast est retenu — pas son co-auteur externe."""
    con = connect(_duckdb_cfg(minio))
    glob = _seed_prefiltered(con, minio.bucket)

    from_expr = f"SELECT * FROM read_parquet('{glob}')"
    rows = con.execute(researchers_sql(from_expr)).fetchall()
    author_ids = [r[0] for r in rows]

    # A1 (Le Havre) identifié ; A2/A3 (MIT) exclus MALGRÉ leur co-autorat sur W1 (grain auteur).
    assert author_ids == ["A1"]


def _seed_prefiltered_for_pass2(con, bucket: str) -> str:
    """Brut pré-filtré pour la passe 2 ; renvoie son glob.

    - W1 : EUNICoast — A1 affilié Le Havre (→ A1 identifié en passe 1).
    - W3 : SANS affiliation EUNICoast — A1 (affilié MIT sur ce work) + A2 (MIT). A1 y co-signe.
    - W4 : SANS aucun chercheur identifié — A2 + A3 (MIT).
    Attendu passe 2 : {W1, W3} (W3 retenu PAR ÉLARGISSEMENT — A1 y co-signe, bien qu'aucune
    affiliation EUNICoast sur W3) ; W4 exclu (aucun chercheur identifié)."""
    dest = f"s3://{bucket}/prefiltered/part-00000.parquet"
    con.execute(
        f"""
        COPY (
            SELECT * FROM (VALUES
                ('W1', 2020, 'article', 't1', {_EMPTY}, {_EMPTY}, 1.0, 5, DATE '2021-01-01',
                    [{{'author': {{'id': 'A1'}}, 'institutions': [{{'ror': '{_EUNI_ROR}'}}]}}]),
                ('W3', 2022, 'article', 't3', {_EMPTY}, {_EMPTY}, 2.0, 8, DATE '2023-01-01',
                    [
                        {{'author': {{'id': 'A1'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}},
                        {{'author': {{'id': 'A2'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}}
                    ]),
                ('W4', 2021, 'article', 't4', {_EMPTY}, {_EMPTY}, 1.0, 2, DATE '2022-01-01',
                    [
                        {{'author': {{'id': 'A2'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}},
                        {{'author': {{'id': 'A3'}}, 'institutions': [{{'ror': '{_EXT_ROR}'}}]}}
                    ])
            ) AS t(id, publication_year, type, title, topics, keywords,
                   fwci, cited_by_count, updated_date, authorships)
        ) TO '{dest}' (FORMAT PARQUET)
        """
    )
    return f"s3://{bucket}/prefiltered/*.parquet"


def test_pass2_expands_to_works_without_eunicoast_affiliation(minio):
    """Passe 2 : un work co-écrit par un chercheur identifié est retenu même sans affil.

    C'est l'élargissement (ADR 0103 §1.3) : l'affiliation du work n'importe pas."""
    con = connect(_duckdb_cfg(minio))
    glob = _seed_prefiltered_for_pass2(con, minio.bucket)
    prefiltered_from = f"SELECT * FROM read_parquet('{glob}')"

    # Passe 1 sur ce jeu → {A1} (seul affilié EUNICoast, via W1).
    researchers_from = researchers_sql(prefiltered_from)

    rows = con.execute(scholar_works_sql(prefiltered_from, researchers_from)).fetchall()
    work_ids = [r[0] for r in rows]

    # W1 (affilié) ET W3 (hors affiliation, mais A1 y co-signe) retenus ; W4 exclu.
    assert work_ids == ["W1", "W3"]


def test_pass2_work_ids_are_unique_and_dedup_by_recency(minio):
    """Passe 2 : work_id UNIQUES dans la liste finale (dédup), la version gardée = la plus récente.

    Un même work_id apparaît DEUX fois (réédition OpenAlex + doublon inter-fichiers) ; la
    liste finale n'en garde qu'une (ADR 0099), la plus récente par ``updated_date``. On
    vérifie explicitement l'UNICITÉ (count(distinct)=count) — le cœur de la demande."""
    con = connect(_duckdb_cfg(minio))
    dest = f"s3://{minio.bucket}/prefiltered/part-00000.parquet"
    auth = f"[{{'author': {{'id': 'A1'}}, 'institutions': [{{'ror': '{_EUNI_ROR}'}}]}}]"
    con.execute(
        f"""
        COPY (
            SELECT * FROM (VALUES
                ('W1', 2020, 'article', 'ancienne', {_EMPTY}, {_EMPTY}, 1.0, 5, DATE '2021-01-01',
                    {auth}),
                ('W1', 2020, 'article', 'recente',  {_EMPTY}, {_EMPTY}, 1.0, 9, DATE '2023-06-01',
                    {auth}),
                ('W2', 2021, 'article', 'w2',        {_EMPTY}, {_EMPTY}, 1.0, 1, DATE '2022-01-01',
                    {auth})
            ) AS t(id, publication_year, type, title, topics, keywords,
                   fwci, cited_by_count, updated_date, authorships)
        ) TO '{dest}' (FORMAT PARQUET)
        """
    )
    glob = f"s3://{minio.bucket}/prefiltered/*.parquet"
    prefiltered_from = f"SELECT * FROM read_parquet('{glob}')"
    researchers_from = researchers_sql(prefiltered_from)
    final = scholar_works_sql(prefiltered_from, researchers_from)

    # UNICITÉ (demande explicite) : autant de work_id distincts que de lignes.
    total, distinct = con.execute(f"SELECT count(*), count(DISTINCT id) FROM ({final})").fetchone()
    assert total == distinct == 2  # W1 (dédupliqué) + W2

    # La version gardée de W1 est la plus récente (updated_date 2023-06-01 → 'recente').
    kept_w1 = con.execute(f"SELECT title FROM ({final}) WHERE id = 'W1'").fetchone()[0]
    assert kept_w1 == "recente"


def test_pass2_tie_break_is_deterministic_on_equal_updated_date(minio):
    """Départage DÉTERMINISTE (ADR 0057) : à date égale, fwci puis cited_by_count tranchent."""
    con = connect(_duckdb_cfg(minio))
    dest = f"s3://{minio.bucket}/prefiltered/part-00000.parquet"
    auth = f"[{{'author': {{'id': 'A1'}}, 'institutions': [{{'ror': '{_EUNI_ROR}'}}]}}]"
    same_date = "DATE '2022-01-01'"
    con.execute(
        f"""
        COPY (
            SELECT * FROM (VALUES
                ('W1', 2020, 'article', 'faible_fwci', {_EMPTY}, {_EMPTY}, 1.0, 5, {same_date},
                    {auth}),
                ('W1', 2020, 'article', 'fort_fwci',   {_EMPTY}, {_EMPTY}, 9.0, 5, {same_date},
                    {auth})
            ) AS t(id, publication_year, type, title, topics, keywords,
                   fwci, cited_by_count, updated_date, authorships)
        ) TO '{dest}' (FORMAT PARQUET)
        """
    )
    glob = f"s3://{minio.bucket}/prefiltered/*.parquet"
    prefiltered_from = f"SELECT * FROM read_parquet('{glob}')"
    researchers_from = researchers_sql(prefiltered_from)
    final = scholar_works_sql(prefiltered_from, researchers_from)

    rows = con.execute(f"SELECT title FROM ({final})").fetchall()
    assert len(rows) == 1
    # À date égale, le fwci le plus fort gagne (ordre total, jamais arbitraire).
    assert rows[0][0] == "fort_fwci"


def _point_env_at_minio(monkeypatch, minio, mode: str) -> None:
    """Pose l'env pour que les assets lisent/écrivent le MinIO de test."""
    host, port = minio.endpoint.split(":")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", minio.access_key)
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", minio.secret_key)
    monkeypatch.setenv("BUCKET_HOST", host)
    monkeypatch.setenv("BUCKET_PORT", port)
    monkeypatch.setenv("BUCKET_NAME", minio.bucket)
    monkeypatch.setenv("SCHOLAR_NETWORK_PERSISTENCE_MODE", mode)
    monkeypatch.setenv("DBT_DUCKDB_MEMORY_LIMIT", "2GB")
    monkeypatch.setenv("DBT_DUCKDB_THREADS", "2")
    monkeypatch.setenv("DBT_DUCKDB_TEMP_DIR", "/tmp/scholar-network-spill")


def test_assets_pass1_then_pass2_end_to_end_ephemeral(minio, monkeypatch):
    """Exécute researchers() PUIS scholar_works() (mode ephemeral : source lue à la volée).

    ephemeral force le chemin ``_prefiltered_relation_sql`` = recalcul depuis la source →
    on pointe la source sur le pré-filtré synthétique déjà en MinIO. Prouve la chaîne réelle
    des deux assets (COPY vers passes/…) + la sémantique d'élargissement de bout en bout."""
    seed = connect(_duckdb_cfg(minio))
    glob = _seed_prefiltered_for_pass2(seed, minio.bucket)  # W1(EUNI A1), W3(A1 hors-affil), W4
    _point_env_at_minio(monkeypatch, minio, "ephemeral")
    # ephemeral : le brut pré-filtré n'est pas matérialisé → les passes relisent la source.
    # On pointe la source sur le pré-filtré synthétique (déjà ≥2016∧article) : le prédicat est
    # idempotent, donc re-filtrer un pré-filtré ne change rien.
    monkeypatch.setenv("SCHOLAR_NETWORK_SOURCE_GLOB", glob)

    r_result = researchers()
    assert r_result.metadata["researchers"].value == 1  # A1 seul identifié
    # La table est écrite au préfixe stable, relisible par la passe 2.
    n_tbl = seed.execute(
        f"SELECT count(*) FROM read_parquet('{researchers_glob(minio.bucket)}')"
    ).fetchone()[0]
    assert n_tbl == 1

    w_result = scholar_works()
    # W1 (affilié) + W3 (élargissement, A1 co-signe hors EUNICoast) ; W4 exclu.
    assert w_result.metadata["scholar_works"].value == 2


def test_asset_researchers_full_mode_reads_cache(minio, monkeypatch):
    """researchers() en full : lit le cache prefiltered/ matérialisé (couvre le chemin cache)."""
    seed = connect(_duckdb_cfg(minio))
    # Matérialise un brut pré-filtré sous le préfixe cache full (prefiltered/).
    _seed_prefiltered(seed, minio.bucket)  # écrit prefiltered/part-00000.parquet (W1 EUNICoast)
    _point_env_at_minio(monkeypatch, minio, "full")

    r_result = researchers()
    # Depuis le cache full : W1 porte A1 (Le Havre) → 1 chercheur identifié.
    assert r_result.metadata["researchers"].value == 1
    assert r_result.metadata["cache_mode"].value == "full"
    assert f"{RESEARCHERS_SUBDIR}" in r_result.metadata["destination"].value

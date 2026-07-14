"""Contrat de qualité de la donnée SERVIE — asset check bloquant (ADR 0103 §2, lot 6).

scholar-network N'A PAS de couche dbt (chaîne linéaire, produit = vecteur de similarité —
ADR 0103) : le contrat de schéma servi est porté ICI (asset check Dagster) + par la migration
Postgres (contraintes natives sur la table pgvector). C'est le pendant, pour la SORTIE, de ce
que les tests dbt not_null/unique font chez citation — mais ciblé sur ce qui compte vraiment :
les invariants du vecteur de profil, inexprimables en test dbt de colonne.

Le check porte sur ``scholar_profiles`` (Parquet ``(researcher_id, embedding[384])``, sortie
de l'asset du même nom, entrée de ``index_load``). Porte de qualité **BLOQUANTE** : un mart de
profils qui viole un invariant NE doit PAS être chargé dans l'index pgvector.

Invariants vérifiés (les 4 que dbt ne pourrait pas garantir sur cette sortie) :
  1. **unicité** ``researcher_id`` — un profil par chercheur (pas de doublon → kNN faussé) ;
  2. **dimension** — chaque vecteur fait exactement ``EMBEDDING_DIM`` (384) ;
  3. **normalité L2** — norme ≈ 1 (l'invariant métier de ``aggregate_author`` : moyenne + L2) ;
  4. **validité** — aucune composante NaN/inf (un vecteur dégénéré casse la recherche cosinus).

Le corps ``check_scholar_profiles`` est PUR (prend une liste de lignes) → testable sans Dagster
ni réseau. Le wrapper ``@asset_check`` résout le run, lit le Parquet, délègue.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

import numpy as np
from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from scholar_network_dagster import embedding, lakehouse
from scholar_network_dagster.assets.profiles import PROFILES_SUBDIR
from scholar_network_dagster.resources import ceph_target_from_env

# Tolérance sur la norme L2 (le vecteur est mean-pool PUIS L2 ; flottant → ≈ 1, pas == 1).
_L2_TOL = 1e-4


def check_scholar_profiles(rows) -> AssetCheckResult:
    """Valide le contrat de la donnée servie (PURE ; ADR 0103 §2).

    ``rows`` : itérable de ``(researcher_id, embedding)`` — ``embedding`` = liste/array de
    floats. Renvoie un ``AssetCheckResult`` bloquant : ``passed=False`` dès qu'un invariant
    est violé, avec la liste des violations en métadonnée (transparence de la porte).
    """
    rows = list(rows)
    ids = [r[0] for r in rows]
    vecs = [np.asarray(r[1], dtype=np.float64) for r in rows]

    failed = []
    # 1. unicité researcher_id.
    if len(ids) != len(set(ids)):
        dupes = len(ids) - len(set(ids))
        failed.append(f"unicité: {dupes} researcher_id dupliqué(s)")
    # 2. dimension.
    bad_dim = sum(1 for v in vecs if v.shape != (embedding.EMBEDDING_DIM,))
    if bad_dim:
        failed.append(f"dimension: {bad_dim} vecteur(s) ≠ {embedding.EMBEDDING_DIM}")
    # 3. normalité L2 (uniquement sur les vecteurs de bonne dimension, sinon norm dénuée de sens).
    bad_norm = sum(
        1
        for v in vecs
        if v.shape == (embedding.EMBEDDING_DIM,) and abs(float(np.linalg.norm(v)) - 1.0) > _L2_TOL
    )
    if bad_norm:
        failed.append(f"normalité L2: {bad_norm} vecteur(s) de norme ≠ 1 (±{_L2_TOL})")
    # 4. validité (aucune composante non finie).
    bad_finite = sum(1 for v in vecs if not np.isfinite(v).all())
    if bad_finite:
        failed.append(f"validité: {bad_finite} vecteur(s) avec NaN/inf")

    passed = not failed
    return AssetCheckResult(
        passed=passed,
        metadata={
            "profiles_evaluated": len(rows),
            "embedding_dim": embedding.EMBEDDING_DIM,
            "violations": ", ".join(failed) or "—",
        },
    )


def _read_profiles(con, bucket: str, run_id: str):
    """Lit le Parquet des profils du run courant → lignes ``(researcher_id, embedding)``."""
    glob = f"s3://{bucket}/{PROFILES_SUBDIR}/run={run_id}/*.parquet"
    return con.execute(
        f"SELECT researcher_id, embedding FROM read_parquet('{glob}') ORDER BY researcher_id"
    ).fetchall()


@asset_check(asset=AssetKey("scholar_profiles"), name="profiles_contract", blocking=True)
def profiles_contract(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité BLOQUANTE sur les profils servis (unicité, dim, L2, validité).

    Bloquante : si un invariant est violé, Dagster stoppe la chaîne AVANT ``index_load`` — un
    index pgvector n'est jamais chargé depuis un mart de profils invalide."""
    ceph = ceph_target_from_env()
    con = lakehouse.connect()
    rows = _read_profiles(con, ceph.bucket, context.run.run_id)
    return check_scholar_profiles(rows)

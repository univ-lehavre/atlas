"""Tests du garde-fou de fraîcheur de l'image de CODE (check_code_freshness).

Pendant de test_check_deps_base_freshness. On couvre : l'extraction de la tranche `code`
(le contrat de bornes), le hash SHA_CODE (déterminisme + sensibilité au changement de
code), l'énumération triée des fichiers source (déterminisme + ignore des artefacts), et
le CLI (--print-tag, exit codes).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import check_code_freshness as cc  # noqa: E402

# ── Dockerfile mini : bornes `AS deps` / `AS code` (contrat d'extract_code_stage) ──
_MINI_DOCKERFILE = (
    "ARG DEPS_REF=registry:80/citation-deps-base:dev\n"
    "FROM python:3.10-slim AS deps\n"
    "RUN echo base\n"
    "FROM ${DEPS_REF} AS code\n"
    "COPY citation-dagster/src ./src\n"
    'RUN python -c "print(1)"\n'
)


# ═══════════════════════════════ extract_code_stage ═══════════════════════════


def test_extract_code_stage_borne_debut_from_deps_ref():
    sliced = cc.extract_code_stage(_MINI_DOCKERFILE)
    # Commence au FROM de `code`, inclut tout jusqu'à la fin ; EXCLUT la tranche `deps`.
    assert sliced.startswith("FROM ${DEPS_REF} AS code")
    assert "COPY citation-dagster/src ./src" in sliced
    assert 'RUN python -c "print(1)"' in sliced
    assert "RUN echo base" not in sliced  # la tranche deps n'y est PAS


def test_extract_code_stage_borne_sur_as_code_explicite():
    # Même si DEPS_REF n'est pas dans le FROM, `AS code` suffit comme borne d'ouverture.
    text = "FROM python:3.10-slim AS deps\nRUN x\nFROM base AS code\nRUN y\n"
    assert cc.extract_code_stage(text) == "FROM base AS code\nRUN y"


def test_extract_code_stage_casse_du_mot_as():
    text = "FROM base as deps\nRUN x\nFROM other as code\nRUN y\n"
    assert cc.extract_code_stage(text) == "FROM other as code\nRUN y"


def test_extract_code_stage_leve_si_pas_de_stage_code():
    with pytest.raises(ValueError):
        cc.extract_code_stage("FROM python:3.10-slim AS deps\nRUN echo x\n")


def test_extract_code_stage_sur_dockerfile_reel():
    dockerfile = (Path(__file__).resolve().parents[1] / "Dockerfile").read_text(encoding="utf-8")
    sliced = cc.extract_code_stage(dockerfile)
    assert "AS code" in sliced.splitlines()[0]
    # La cible code copie le src et parse dbt (marqueurs stables du contrat).
    assert "citation-dagster/src" in sliced
    assert "dbt parse" in sliced
    # Elle n'inclut PAS l'egress de la base (apt/rclone appartient à `deps`).
    assert "apt-get" not in sliced


# ═══════════════════════════════ compute_sha_code ═════════════════════════════


def test_compute_sha_code_deterministe_et_12_hex():
    entries = [("a", "x"), ("b", "y")]
    h1 = cc.compute_sha_code(entries)
    h2 = cc.compute_sha_code(entries)
    assert h1 == h2
    assert len(h1) == 12
    assert all(c in "0123456789abcdef" for c in h1)


def test_compute_sha_code_change_si_contenu_change():
    base = cc.compute_sha_code([("src/x.py", "def f(): return 1")])
    changed = cc.compute_sha_code([("src/x.py", "def f(): return 2")])
    assert base != changed  # le code a changé → SHA_CODE change (le but du garde-fou)


def test_compute_sha_code_change_si_ordre_ou_label_change():
    # Le label cadre l'entrée : deux contenus permutés ne collisionnent pas.
    a = cc.compute_sha_code([("src/x.py", "A"), ("dbt/y.sql", "B")])
    b = cc.compute_sha_code([("src/x.py", "B"), ("dbt/y.sql", "A")])
    assert a != b


def test_compute_sha_code_separateur_nul_evite_collision():
    # "labelcontent" concaténé sans séparateur pourrait collisionner ; le \0 l'empêche.
    a = cc.compute_sha_code([("ab", "c")])
    b = cc.compute_sha_code([("a", "bc")])
    assert a != b


# ═══════════════════════════════ _iter_source_files ═══════════════════════════


def test_iter_source_files_trie_et_relatif(tmp_path):
    (tmp_path / "b.py").write_text("")
    (tmp_path / "a.py").write_text("")
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "c.py").write_text("")
    out = cc._iter_source_files(str(tmp_path))
    assert out == ["a.py", "b.py", os.path.join("sub", "c.py")]  # trié, relatif


def test_iter_source_files_ignore_artefacts(tmp_path):
    (tmp_path / "real.py").write_text("")
    (tmp_path / "mod.pyc").write_text("")  # artefact compilé → ignoré
    cache = tmp_path / "__pycache__"
    cache.mkdir()
    (cache / "junk.py").write_text("")  # dossier ignoré
    target = tmp_path / "target"  # artefact dbt → ignoré
    target.mkdir()
    (target / "compiled.sql").write_text("")
    out = cc._iter_source_files(str(tmp_path))
    assert out == ["real.py"]


# ═══════════════════════════════ code_image_tag ═══════════════════════════════


def test_code_image_tag_forme_logique():
    assert cc.code_image_tag("abc123def456") == "registry:80/citation-dagster:abc123def456"
    assert cc.code_image_tag("deadbeef", cl="mediawatch").startswith(
        "registry:80/mediawatch-dagster:"
    )


# ═══════════════════════════════ CLI ══════════════════════════════════════════

_SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_code_freshness.py"


def _run_cli(*args: str):
    return subprocess.run(
        [sys.executable, str(_SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=str(_SCRIPT.parent),
    )


def test_cli_print_tag_imprime_et_exit_0():
    proc = _run_cli("--print-tag")
    assert proc.returncode == 0
    assert proc.stdout.strip().startswith("registry:80/citation-dagster:")
    assert len(proc.stdout.strip().rsplit(":", 1)[-1]) == 12  # SHA_CODE 12 hex


def test_cli_offline_exit_0():
    proc = _run_cli()  # offline (défaut) : cohérence, pas de registre
    assert proc.returncode == 0
    assert "OK" in proc.stderr


def test_cli_workspace_introuvable_exit_2():
    proc = _run_cli("--workspace", "/nonexistent/xyz")
    assert proc.returncode == 2
    assert "CONFIG" in proc.stderr

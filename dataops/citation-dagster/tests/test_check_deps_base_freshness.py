"""Tests du garde-fou de fraîcheur de la pré-image (ADR cluster 0110 §3/§7).

Couvre les fonctions PURES (sans disque ni réseau) : extraction de la tranche
`deps` du Dockerfile, calcul déterministe de SHA_DEPS, format du tag, réécriture
d'endpoint, et classification du résultat d'interrogation registre. Le réseau réel
n'est JAMAIS touché : ``_inspect_mediatype`` est piloté par un subprocess mocké.

Le script vit dans ``scripts/`` (hors du package ``citation_dagster``) : on l'ajoute
à ``sys.path`` comme le fait déjà ``conftest.py`` pour ``fetch_model`` (même patron).
"""

import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import check_deps_base_freshness as cd  # noqa: E402

# ── Dockerfile mini : bornes AS deps / AS code (le CONTRAT d'extract_deps_stage) ──
_MINI_DOCKERFILE = """\
ARG DEPS_REF=registry:80/citation-deps-base:dev

FROM python:3.10-slim@sha256:deadbeef AS deps
RUN apt-get install -y rclone
COPY uv.lock ./
RUN uv pip install -r requirements.txt
RUN python -c "import duckdb; duckdb.connect()"

FROM ${DEPS_REF} AS code
ENV UV_OFFLINE=1
COPY src ./src
RUN uv pip install --no-deps .
"""

_DEPS_SLICE = (
    "FROM python:3.10-slim@sha256:deadbeef AS deps\n"
    "RUN apt-get install -y rclone\n"
    "COPY uv.lock ./\n"
    "RUN uv pip install -r requirements.txt\n"
    'RUN python -c "import duckdb; duckdb.connect()"\n'
)


# ═══════════════════════════════ extract_deps_stage ═══════════════════════════


def test_extract_deps_stage_bornes_as_deps_as_code():
    """La tranche va de `FROM … AS deps` (inclus) jusqu'AVANT `FROM ${DEPS_REF} AS code`.

    Le join conserve la ligne VIDE qui précède `FROM ${DEPS_REF}` (elle est DANS la
    région `deps`) → un `\\n` final. C'est déterministe et sans conséquence pour le
    hash (la tranche entière est hachée telle quelle)."""
    sliced = cd.extract_deps_stage(_MINI_DOCKERFILE)
    assert sliced == _DEPS_SLICE  # inclut le \n final (ligne vide avant l'étage code)
    # La tranche NE contient PAS l'étage `code` (ni son ENV UV_OFFLINE).
    assert "AS deps" in sliced
    assert "AS code" not in sliced
    assert "UV_OFFLINE" not in sliced
    assert "DEPS_REF" not in sliced


def test_extract_deps_stage_ignore_arg_global_avant_from():
    """L'ARG DEPS_REF global (avant tout FROM) n'est PAS dans la tranche `deps`."""
    sliced = cd.extract_deps_stage(_MINI_DOCKERFILE)
    assert not sliced.startswith("ARG")
    assert sliced.startswith("FROM python:3.10-slim")


def test_extract_deps_stage_borne_sur_deps_ref_sans_as_code():
    """Frontière détectée même si le FROM de code utilise ${DEPS_REF} sans `AS code`."""
    text = "FROM python:3.10-slim AS deps\nRUN echo base\nFROM ${DEPS_REF}\nRUN echo code\n"
    assert cd.extract_deps_stage(text) == "FROM python:3.10-slim AS deps\nRUN echo base"


def test_extract_deps_stage_casse_du_mot_as():
    """Le mot-clé AS est insensible à la casse (Docker l'accepte)."""
    text = "FROM base as deps\nRUN echo x\nFROM ${DEPS_REF} as code\nRUN echo y\n"
    assert cd.extract_deps_stage(text) == "FROM base as deps\nRUN echo x"


def test_extract_deps_stage_leve_si_pas_de_stage_deps():
    with pytest.raises(ValueError, match="deps"):
        cd.extract_deps_stage("FROM python:3.10-slim AS build\nRUN echo x\n")


def test_extract_deps_stage_leve_si_pas_de_borne_finale():
    with pytest.raises(ValueError, match="fin de la cible"):
        cd.extract_deps_stage("FROM python:3.10-slim AS deps\nRUN echo x\n")


def test_extract_deps_stage_sur_dockerfile_reel():
    """Ancrage sur le VRAI Dockerfile : la tranche commence à `FROM … AS deps` et
    ne contient pas l'étage `code`."""
    dockerfile = (Path(__file__).resolve().parents[1] / "Dockerfile").read_text()
    sliced = cd.extract_deps_stage(dockerfile)
    assert "AS deps" in sliced
    assert "FROM ${DEPS_REF} AS code" not in sliced
    # Les éléments à egress de la base y sont bien captés (sans les re-parser).
    assert "apt-get" in sliced and "rclone" in sliced
    assert "INSTALL httpfs" in sliced and "INSTALL postgres" in sliced
    assert "fetch_model.py" in sliced
    assert "python:3.10-slim@sha256:" in sliced


# ═══════════════════════════════ compute_sha_deps ═════════════════════════════


def test_compute_sha_deps_deterministe_et_12_hex():
    a = cd.compute_sha_deps("lock", "deps", "prov")
    b = cd.compute_sha_deps("lock", "deps", "prov")
    assert a == b
    assert len(a) == 12
    assert all(c in "0123456789abcdef" for c in a)


def test_compute_sha_deps_change_si_uv_lock_change():
    base = cd.compute_sha_deps("lock-v1", "deps", "prov")
    bumped = cd.compute_sha_deps("lock-v2", "deps", "prov")
    assert base != bumped


def test_compute_sha_deps_change_si_dockerfile_slice_change():
    base = cd.compute_sha_deps("lock", "deps-v1", "prov")
    changed = cd.compute_sha_deps("lock", "deps-v2", "prov")
    assert base != changed


def test_compute_sha_deps_change_si_provenance_change():
    base = cd.compute_sha_deps("lock", "deps", "prov-v1")
    changed = cd.compute_sha_deps("lock", "deps", "prov-v2")
    assert base != changed


def test_compute_sha_deps_provenance_absente_distincte_de_vide():
    """model_provenance CONDITIONNEL : None (absent) ≠ "" (fichier vide) ≠ présent.

    Neutralité : mediawatch/pageviews (sans modèle ONNX) passent None — le hash ne
    doit PAS coïncider avec un fichier provenance vide."""
    absent = cd.compute_sha_deps("lock", "deps", None)
    empty = cd.compute_sha_deps("lock", "deps", "")
    present = cd.compute_sha_deps("lock", "deps", "prov")
    assert absent != empty
    assert absent != present
    assert empty != present


def test_compute_sha_deps_ordre_des_entrees_fixe():
    """Le hash dépend de l'AFFECTATION (pas juste du multiset) : permuter les
    contenus entre entrées change le hash (étiquetage + séparateur nul)."""
    normal = cd.compute_sha_deps("A", "B", "C")
    permuted = cd.compute_sha_deps("B", "A", "C")
    assert normal != permuted


def test_compute_sha_deps_longueur_parametrable():
    assert len(cd.compute_sha_deps("l", "d", "p", length=8)) == 8
    assert len(cd.compute_sha_deps("l", "d", "p", length=64)) == 64


# ═══════════════════════════════ deps_base_tag / endpoint ═════════════════════


def test_deps_base_tag_format():
    assert cd.deps_base_tag("abc123def456") == "registry:80/citation-deps-base:abc123def456"


def test_deps_base_tag_code_location_parametrable():
    assert cd.deps_base_tag("deadbeef", cl="mediawatch") == (
        "registry:80/mediawatch-deps-base:deadbeef"
    )


def test_tag_for_endpoint_reecrit_le_prefixe():
    tag = "registry:80/citation-deps-base:abc123"
    assert cd.tag_for_endpoint(tag, "localhost:5000") == "localhost:5000/citation-deps-base:abc123"


def test_tag_for_endpoint_noop_si_endpoint_egale_registre():
    tag = "registry:80/citation-deps-base:abc123"
    assert cd.tag_for_endpoint(tag, "registry:80") == tag


# ═══════════════════════════════ classify_registry_result ════════════════════

_TAG = "registry:80/citation-deps-base:abc123"
_INDEX = "application/vnd.oci.image.index.v1+json"
_DOCKER_LIST = "application/vnd.docker.distribution.manifest.list.v2+json"
_SINGLE = "application/vnd.oci.image.manifest.v1+json"


def test_classify_index_multiarch_ok():
    assert cd.classify_registry_result(_TAG, _INDEX, reachable=True) == []
    assert cd.classify_registry_result(_TAG, _DOCKER_LIST, reachable=True) == []


def test_classify_base_absente_est_erreur_bloquante():
    findings = cd.classify_registry_result(_TAG, None, reachable=True)
    assert len(findings) == 1
    assert findings[0].level == cd.ERROR
    assert "ABSENTE" in findings[0].message
    # Message pédagogique : commande de rebuild+push présente.
    assert "buildx build" in findings[0].message and "--target deps" in findings[0].message


def test_classify_mono_arch_est_warning():
    findings = cd.classify_registry_result(_TAG, _SINGLE, reachable=True)
    assert len(findings) == 1
    assert findings[0].level == cd.WARNING
    assert "mono-arch" in findings[0].message


def test_classify_injoignable_est_warning_pas_erreur():
    """« registre injoignable » ≠ « base absente » : WARNING, pas ERROR bloquant."""
    findings = cd.classify_registry_result(_TAG, None, reachable=False)
    assert len(findings) == 1
    assert findings[0].level == cd.WARNING
    assert "port-forward" in findings[0].message


# ═══════════════════════════════ main() — bout en bout mocké ══════════════════


def test_main_offline_exit_0(capsys):
    """OFFLINE (défaut) : lit les VRAIES entrées, calcule SHA_DEPS, exit 0."""
    assert cd.main([]) == 0
    err = capsys.readouterr().err
    assert "SHA_DEPS=" in err
    assert "OFFLINE" in err


def test_main_print_tag_exit_0(capsys):
    """--print-tag imprime le tag logique sur stdout et sort 0."""
    assert cd.main(["--print-tag"]) == 0
    out = capsys.readouterr().out.strip()
    assert out.startswith("registry:80/citation-deps-base:")
    sha = out.rsplit(":", 1)[1]
    assert len(sha) == 12


def test_main_sha_deps_stable_entre_appels(capsys):
    """SHA_DEPS STABLE : deux --print-tag donnent le MÊME tag."""
    cd.main(["--print-tag"])
    first = capsys.readouterr().out.strip()
    cd.main(["--print-tag"])
    second = capsys.readouterr().out.strip()
    assert first == second


def test_main_workspace_introuvable_exit_2(capsys, tmp_path):
    """Source introuvable → exit 2 (config)."""
    assert cd.main(["--workspace", str(tmp_path)]) == 2
    assert "introuvable" in capsys.readouterr().err


def _only_crane(name):
    """which() qui ne trouve QUE crane (isole le mode online sur crane)."""
    return "/usr/bin/crane" if name == "crane" else None


def _fake_run(returncode=0, stdout="", stderr=""):
    """Fabrique un subprocess.run mocké renvoyant un CompletedProcess figé."""

    def run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, returncode=returncode, stdout=stdout, stderr=stderr)

    return run


def test_main_online_base_absente_exit_1(monkeypatch, capsys):
    """ONLINE + base absente (subprocess mocké : returncode≠0, 404) → exit 1."""
    monkeypatch.setattr(cd.shutil, "which", _only_crane)
    monkeypatch.setattr(
        cd.subprocess, "run", _fake_run(returncode=1, stderr="MANIFEST_UNKNOWN: not found")
    )
    assert cd.main(["--check-registry"]) == 1
    assert "ABSENTE" in capsys.readouterr().err


def test_main_online_base_presente_index_exit_0(monkeypatch, capsys):
    """ONLINE + base présente (index multi-arch) → exit 0."""
    monkeypatch.setattr(cd.shutil, "which", _only_crane)
    monkeypatch.setattr(cd.subprocess, "run", _fake_run(stdout='{"mediaType": "' + _INDEX + '"}'))
    assert cd.main(["--check-registry"]) == 0


def test_main_online_injoignable_warning_exit_0(monkeypatch, capsys):
    """ONLINE + endpoint injoignable → WARNING non bloquant, exit 0."""
    monkeypatch.setattr(cd.shutil, "which", _only_crane)
    monkeypatch.setattr(
        cd.subprocess, "run", _fake_run(returncode=1, stderr="dial tcp: connection refused")
    )
    assert cd.main(["--check-registry"]) == 0
    assert "port-forward" in capsys.readouterr().err


def test_main_online_sans_outil_exit_2(monkeypatch, capsys):
    """ONLINE mais ni crane ni docker → exit 2 (config)."""
    monkeypatch.setattr(cd.shutil, "which", lambda name: None)
    assert cd.main(["--check-registry"]) == 2
    assert "crane" in capsys.readouterr().err


def test_main_check_registry_via_env(monkeypatch, capsys):
    """L'env CHECK_REGISTRY active le mode online (comme --check-registry)."""
    monkeypatch.setenv("CHECK_REGISTRY", "1")
    monkeypatch.setattr(cd.shutil, "which", lambda name: None)
    # Online sans outil → exit 2 : prouve que le mode online a bien été activé par l'env.
    assert cd.main([]) == 2


def test_inspect_mediatype_construit_ref_endpoint(monkeypatch):
    """_inspect_mediatype interroge l'ENDPOINT réécrit, pas le tag logique."""
    monkeypatch.setattr(cd.shutil, "which", _only_crane)
    captured = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        return subprocess.CompletedProcess(
            cmd, returncode=0, stdout='{"mediaType": "' + _INDEX + '"}', stderr=""
        )

    monkeypatch.setattr(cd.subprocess, "run", fake_run)
    reachable, mt = cd._inspect_mediatype(_TAG, "localhost:5000")
    assert reachable is True
    assert mt == _INDEX
    # Le ref interrogé porte l'endpoint (localhost:5000), pas registry:80.
    assert "localhost:5000/citation-deps-base:abc123" in captured["cmd"]
    assert "--insecure" in captured["cmd"]

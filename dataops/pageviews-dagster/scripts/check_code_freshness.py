"""Garde-fou de fraîcheur de l'IMAGE DE CODE ``pageviews-dagster`` (build hors cluster).

Pendant de ``check_deps_base_freshness.py`` (qui garde la pré-image ``deps-base``), mais
pour l'image de CODE. Le risque symétrique : un développeur modifie le code de la
code-location (``src/``, projet dbt, tranche ``code`` du Dockerfile) et OUBLIE de
rebuilder/pousser l'image → le cluster déploie une image PÉRIMÉE (le drift « pageviews en
retard de N commits » vécu). Ce check DÉTECTE l'écart et alerte de façon bloquante.

DOCTRINE (ADR cluster 0110 amendé) : le build in-pod (buildkit rootless) est ABANDONNÉ
(PodSecurity ``baseline`` refuse ``seccompProfile: Unconfined`` sur k8s ≥ 1.34) ; l'image
de code se build SUR LE POSTE (``deploy/build-code.sh``, ``--target code``) puis se pousse
au registre. Ce garde-fou est le pendant « fraîcheur » de ce build manuel.

────────────────────────────── ENTRÉES DE ``SHA_CODE`` ────────────────────────
``SHA_CODE`` = sha256 (tronqué 12 hex, cohérent avec un SHA git court) des entrées de la
cible ``code`` du Dockerfile — CE QUI CHANGE quand « le code a changé » :
  1. ``src/<cl>_dagster/`` (récursif) : tout le code Python de la code-location.
  2. ``pageviews-dbt/`` (récursif) : le projet dbt copié dans l'image (``models``,
     ``macros``, ``seeds``, ``dbt_project.yml``…). ATTENTION : dossier FRÈRE de la
     code-location (contexte de build = ``dataops/``), pas sous ``pageviews-dagster/``.
  3. ``pyproject.toml`` : les métadonnées/points d'entrée du paquet (``uv pip install .``).
  4. La TRANCHE ``code`` du ``Dockerfile`` (de ``FROM ${DEPS_REF} … AS code`` à la fin) :
     si les instructions de build du code changent (COPY, dbt parse, USER…).
On N'INCLUT PAS ``uv.lock`` ni la tranche ``deps`` : ce sont les entrées de la deps-base,
gardées séparément par ``check_deps_base_freshness.py`` (cycle de vie disjoint, ADR 0110).

Calcul DÉTERMINISTE : parcours ORDONNÉ (tri des chemins) des fichiers, chaque entrée
étiquetée + séparateur nul, puis sha256. Robuste à l'ordre du système de fichiers.

──────────────────────────── CONTRAT SHA_CODE ↔ TAG ──────────────────────────
Le tag de l'image de code peut ENCODER ce digest : ``registry:80/pageviews-dagster:<SHA_CODE>``
(immuable, jamais ``:latest`` — ADR cluster 0006). ``--print-tag`` l'imprime — source de
vérité unique consommée par ``build-code.sh`` (``--tag``). NB : le tag COURANT du pipeline
est ``:dev`` (déployé par digest, pas par tag) ; ``SHA_CODE`` sert la fraîcheur et un
éventuel tag immuable, pas à renommer le flux existant.

──────────────────────────────── MODE DUAL ───────────────────────────────────
  • OFFLINE (défaut, CI) : calcule ``SHA_CODE`` + confirme que les entrées se lisent et
    que la tranche ``code`` s'extrait. SANS réseau. Exit 0 si cohérent.
  • ONLINE (``--check-registry``, poste) : EN PLUS, interroge le registre pour vérifier
    que ``pageviews-dagster:<SHA_CODE>`` existe. Absente → ERREUR BLOQUANTE (le code a
    changé sans rebuild+push de l'image).

Réutilise les briques PURES de ``check_deps_base_freshness`` (extraction de tranche par
marqueurs, interrogation crane/docker, classification, Finding, endpoints) — une seule
source de vérité de ces mécanismes.

──────────────────────────────── EXIT CODES ──────────────────────────────────
  0 = OK (offline cohérent, ou online : image présente).
  1 = BLOQUANT MÉTIER : image de code absente au registre (mode online) → le code a
      changé sans rebuild+push. Message : builder + pousser l'image avant de déployer.
  2 = CONFIG : entrée source introuvable, ni crane ni docker.

Usage : python scripts/check_code_freshness.py                     (offline, défaut)
        python scripts/check_code_freshness.py --print-tag
        python scripts/check_code_freshness.py --check-registry \\
            --registry-endpoint localhost:5000
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys

# Réutilisation des briques PURES du check deps (même dossier scripts/) — une seule
# source de vérité pour l'extraction de tranche, l'interrogation registre, la
# classification et les niveaux de constat. On n'importe QUE du pur + l'I/O registre.
from check_deps_base_freshness import (  # type: ignore[import-not-found]
    ERROR,
    WARNING,
    Finding,
    _from_stage_name,
    _inspect_mediatype,
    classify_registry_result,
)

_DEFAULT_CL = "pageviews"
_REGISTRY_LOGICAL = "registry:80"
_REGISTRY_ENDPOINT_DEFAULT = "registry:80"

# scripts/ → parent = dataops/pageviews-dagster/ (le workspace de la code-location).
_WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ═════════════════════════════════════════════════════════════════════════════
# LOGIQUE PURE — extraction de la tranche `code` + hash des entrées code
# ═════════════════════════════════════════════════════════════════════════════


def extract_code_stage(dockerfile_text: str) -> str:
    """Tranche ``FROM ${DEPS_REF} … AS code`` jusqu'à la FIN du Dockerfile. Pure.

    Repérée par MARQUEURS (le ``FROM`` qui ouvre ``code`` — ``AS code`` ou consommation
    de ``${DEPS_REF}``), symétrique de ``extract_deps_stage``. Hacher cette tranche
    capte les instructions de build du CODE (COPY src, uv pip install, dbt parse, USER)
    sans numéros de ligne fragiles.

    Lève ``ValueError`` si la borne de début est introuvable (Dockerfile inattendu).
    """
    lines = dockerfile_text.splitlines()
    start = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.upper().startswith("FROM "):
            continue
        # Frontière d'ouverture de `code` : `AS code` OU un FROM qui consomme ${DEPS_REF}.
        if (
            _from_stage_name(stripped) == "code"
            or "${DEPS_REF}" in stripped
            or "$DEPS_REF" in stripped
        ):
            start = i
            break
    if start is None:
        raise ValueError(
            "Dockerfile : cible `code` introuvable (ni `FROM ${DEPS_REF}` ni `AS code`)."
        )
    # De la cible `code` (inclus) jusqu'à la fin du fichier.
    return "\n".join(lines[start:])


def _iter_source_files(root: str) -> list[str]:
    """Liste TRIÉE des fichiers sous ``root`` (récursif), chemins RELATIFS à ``root``. Pure.

    Tri lexicographique → déterminisme indépendant de l'ordre du système de fichiers.
    Ignore les artefacts non-source (``__pycache__``, ``.pyc``, ``target/`` dbt, ``logs/``)
    qui ne définissent PAS le code : les inclure ferait varier ``SHA_CODE`` sans changement
    réel de code (bruit de compilation/exécution locale).
    """
    ignored_dirs = {"__pycache__", "target", "logs", ".pytest_cache", ".ruff_cache"}
    out: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in ignored_dirs)
        for name in sorted(filenames):
            if name.endswith((".pyc", ".pyo")):
                continue
            abs_path = os.path.join(dirpath, name)
            out.append(os.path.relpath(abs_path, root))
    return sorted(out)


def compute_sha_code(
    entries: list[tuple[str, str]],
    *,
    length: int = 12,
) -> str:
    """``SHA_CODE`` = sha256 tronqué des entrées de la cible ``code``. Pure.

    ``entries`` = liste ORDONNÉE de ``(label, content)`` — l'appelant garantit l'ordre
    (tri des chemins). Chaque entrée : label + octet nul + contenu + octet nul (cadre
    non ambigu, insensible à une frontière de contenu qui imiterait un label).
    Tronqué à ``length`` hex (12, comme un SHA git court du pipeline).
    """
    hasher = hashlib.sha256()
    for label, content in entries:
        hasher.update(label.encode("utf-8"))
        hasher.update(b"\0")
        hasher.update(content.encode("utf-8"))
        hasher.update(b"\0")
    return hasher.hexdigest()[:length]


def code_image_tag(sha_code: str, cl: str = _DEFAULT_CL, registry: str = _REGISTRY_LOGICAL) -> str:
    """Tag LOGIQUE immuable de l'image de code : ``<registry>/<cl>-dagster:<SHA_CODE>``. Pure."""
    return f"{registry}/{cl}-dagster:{sha_code}"


# ═════════════════════════════════════════════════════════════════════════════
# I/O — lecture des entrées (NON pur ; injecté dans main)
# ═════════════════════════════════════════════════════════════════════════════


def _read_text(path: str) -> str:
    with open(path, encoding="utf-8", errors="replace") as handle:
        return handle.read()


def _load_code_entries(workspace: str, cl: str) -> list[tuple[str, str]]:
    """Lit et ÉTIQUETTE les entrées de la cible ``code``, ORDONNÉES. NON pur.

    Ordre déterministe : pyproject → tranche Dockerfile `code` → src/ (trié) → dbt (trié).
    Lève ``FileNotFoundError`` / ``ValueError`` (propagées en exit 2 par main).
    ``pageviews-dbt`` est un dossier FRÈRE (contexte de build ``dataops/``) : on remonte
    d'un cran depuis le workspace de la code-location.
    """
    module = cl.replace("-", "_") + "_dagster"
    dataops_ctx = os.path.dirname(workspace)  # dataops/ (parent de pageviews-dagster/)
    dbt_dir = os.path.join(dataops_ctx, f"{cl}-dbt")

    entries: list[tuple[str, str]] = []

    # 1. pyproject.toml (métadonnées + points d'entrée du paquet).
    entries.append(("pyproject.toml", _read_text(os.path.join(workspace, "pyproject.toml"))))

    # 2. Tranche `code` du Dockerfile.
    dockerfile_text = _read_text(os.path.join(workspace, "Dockerfile"))
    entries.append(("dockerfile:code", extract_code_stage(dockerfile_text)))

    # 3. src/<module>/ (récursif, trié) — le code Python.
    src_root = os.path.join(workspace, "src", module)
    if not os.path.isdir(src_root):
        raise FileNotFoundError(f"code source introuvable : {src_root}")
    for rel in _iter_source_files(src_root):
        entries.append((f"src/{rel}", _read_text(os.path.join(src_root, rel))))

    # 4. <cl>-dbt/ (récursif, trié) — le projet dbt copié dans l'image.
    if os.path.isdir(dbt_dir):
        for rel in _iter_source_files(dbt_dir):
            entries.append((f"dbt/{rel}", _read_text(os.path.join(dbt_dir, rel))))

    return entries


# ═════════════════════════════════════════════════════════════════════════════
# ORCHESTRATION
# ═════════════════════════════════════════════════════════════════════════════


def _report(findings: list[Finding]) -> int:
    warnings = [f for f in findings if f.level == WARNING]
    errors = [f for f in findings if f.level == ERROR]
    for finding in warnings:
        print(f"check-code: AVERTISSEMENT — {finding.message}", file=sys.stderr)
    for finding in errors:
        print(f"check-code: ERREUR — {finding.message}", file=sys.stderr)
    if errors:
        print(
            f"\ncheck-code: {len(errors)} constat(s) BLOQUANT(S), {len(warnings)} "
            "avertissement(s). Rebuilder + pousser l'image de code "
            "`pageviews-dagster:<SHA_CODE>` (deploy/build-code.sh) avant de déployer.",
            file=sys.stderr,
        )
        return 1
    print(
        f"check-code: OK ({len(warnings)} avertissement(s), 0 constat bloquant).",
        file=sys.stderr,
    )
    return 0


def _classify_code_registry(tag: str, mediatype: str | None, reachable: bool) -> list[Finding]:
    """Comme ``classify_registry_result`` mais avec un message d'ERREUR propre au CODE.

    On réutilise la classification (reachable / index) et on ne re-rédige que le constat
    « absente » (rebuild de l'image de CODE, pas de la deps-base).
    """
    findings = classify_registry_result(tag, mediatype, reachable)
    out: list[Finding] = []
    for f in findings:
        if f.level == ERROR:
            out.append(
                Finding(
                    ERROR,
                    f"image de code ABSENTE au registre : {tag}. Le code a changé (src / dbt / "
                    "Dockerfile:code) sans rebuild+push. Builder puis pousser l'image AVANT de "
                    "déployer :\n"
                    "    dataops/pageviews-dagster/deploy/build-code.sh "
                    "--endpoint=<host:port> --tag=<SHA_CODE>\n"
                    "puis relancer ce check.",
                )
            )
        else:
            out.append(f)
    return out


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Garde-fou de fraîcheur de l'image de code pageviews-dagster (ADR 0110).",
    )
    parser.add_argument(
        "--check-registry",
        action="store_true",
        default=_env_flag("CHECK_REGISTRY"),
        help="Mode ONLINE : interroge le registre pour vérifier que l'image <SHA_CODE> existe.",
    )
    parser.add_argument(
        "--print-tag",
        action="store_true",
        help="Imprime le tag LOGIQUE (registry:80/<cl>-dagster:<SHA_CODE>) et sort 0. "
        "Source de vérité unique du tag pour build-code.sh.",
    )
    parser.add_argument(
        "--registry-endpoint",
        default=os.environ.get("REGISTRY_ENDPOINT", _REGISTRY_ENDPOINT_DEFAULT),
        help="Endpoint d'INTERROGATION (env REGISTRY_ENDPOINT, défaut registry:80). "
        "Sur macOS via port-forward : localhost:<lport>. Le TAG garde registry:80/….",
    )
    parser.add_argument(
        "--code-location",
        default=_DEFAULT_CL,
        help="Code-location (défaut pageviews).",
    )
    parser.add_argument(
        "--workspace",
        default=_WORKSPACE,
        help="Racine du workspace de la code-location (défaut : parent de scripts/).",
    )
    return parser


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def main(argv: list[str] | None = None) -> int:
    """Lit les entrées code, calcule SHA_CODE, vérifie la cohérence (+ registre si online).

    Exit : 0 = OK, 1 = image absente (online), 2 = config (source introuvable, ni crane
    ni docker).
    """
    args = _build_parser().parse_args(argv)

    try:
        entries = _load_code_entries(args.workspace, args.code_location)
    except (FileNotFoundError, ValueError) as exc:
        print(f"check-code: ERREUR CONFIG — {exc}", file=sys.stderr)
        return 2

    sha_code = compute_sha_code(entries)
    logical_tag = code_image_tag(sha_code, args.code_location)

    if args.print_tag:
        print(logical_tag)
        return 0

    findings: list[Finding] = []
    if args.check_registry:
        import shutil

        if not (shutil.which("crane") or shutil.which("docker")):
            print(
                "check-code: ERREUR CONFIG — ni `crane` ni `docker` : impossible d'interroger "
                "le registre en mode --check-registry.",
                file=sys.stderr,
            )
            return 2
        reachable, mediatype = _inspect_mediatype(logical_tag, args.registry_endpoint)
        findings.extend(_classify_code_registry(logical_tag, mediatype, reachable))

    return _report(findings)


if __name__ == "__main__":
    raise SystemExit(main())

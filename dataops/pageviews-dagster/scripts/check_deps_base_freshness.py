#!/usr/bin/env python3
"""Garde-fou de fraîcheur de la pré-image de build (ADR cluster 0110 §3/§7).

Empêche de déployer du code applicatif sur une pré-image ``pageviews-deps-base``
PÉRIMÉE. Le modèle « le poste pousse la base, le code se build in-pod » (ADR 0110)
a un risque : un développeur bumpe ``uv.lock``, oublie de rebuilder/pousser la
deps-base, et le build de code (``FROM pageviews-deps-base:<vieux-hash>``) casse —
ou pire, tourne contre des dépendances obsolètes. Ce filet transforme un oubli
silencieux en ÉCHEC EXPLICITE avant push. Il est le pendant, côté dépendances, du
garde-fou lock↔pyproject (``--frozen`` déjà présent au build).

────────────────────────────── CE QUI EST HACHÉ ──────────────────────────────
``SHA_DEPS`` = sha256 des ENTRÉES de la cible ``deps`` du Dockerfile, tronqué à
12 hex (cohérent avec les SHA git courts du pipeline, cf. ``revision`` du
code-location manifest). Trois entrées, TOUTES dans ``dataops/pageviews-dagster/`` :

  1. ``uv.lock`` (fichier entier, ~2841 lignes, ~193 paquets ; chaque wheel porte
     son sha256). C'est l'entrée DOMINANTE — un bump de dépendance la change.
  2. La TRANCHE ``deps`` du ``Dockerfile`` (de ``FROM … AS deps`` jusqu'à la ligne
     précédant ``FROM ${DEPS_REF} … AS code``), extraite par ``extract_deps_stage``.
     Hacher la tranche ENTIÈRE capte SANS parsing fragile : le digest de la base
     ``python:3.10-slim@sha256:…``, l'``apt-get install rclone``, les extensions
     DuckDB (``httpfs``/``postgres``), et tout changement d'étape/ENV/ordre. On
     évite ainsi de re-parser séparément chacun de ces éléments (ADR 0110 §3 les
     liste ; ici la tranche Dockerfile les subsume).
  3. ``model_provenance.py`` (fichier entier) — la provenance du modèle ONNX :
     ``HF_REPO``/``HF_REVISION`` + les sha256 des 4 fichiers. Un changement de
     révision HuggingFace change ``SHA_DEPS`` (le modèle est cuit dans la base).

Le calcul est DÉTERMINISTE : concaténation ORDONNÉE (uv.lock, tranche Dockerfile,
model_provenance) avec un séparateur nul et une étiquette par entrée, puis sha256.
Deux appels sur les mêmes entrées donnent le MÊME hash.

────────────────────────────── CONTRAT SHA_DEPS ↔ TAG ─────────────────────────
Le tag de la base ENCODE ce digest : ``registry:80/pageviews-deps-base:<SHA_DEPS>``
(immuable, jamais ``:latest`` — ADR cluster 0006). ``--print-tag`` imprime ce tag :
c'est la SOURCE DE VÉRITÉ UNIQUE partagée entre CE check et le script de build de
la base (les deux taguent au MÊME hash).

PRÉREQUIS À CÂBLER (hors périmètre de ce check) : le Dockerfile a
``ARG DEPS_REF=registry:80/pageviews-deps-base:dev`` (défaut banc). En régime réel,
le build de la base doit tagger ``:<SHA_DEPS>`` (que ``--print-tag`` fournit) et le
build de code faire ``FROM …:<SHA_DEPS>`` (via ``--build-arg DEPS_REF=…``). Ce
câblage buildx (tag au SHA_DEPS) reste à faire dans le script/Job de build.

──────────────────────────────── MODE DUAL ───────────────────────────────────
  • OFFLINE (défaut, CI) : calcule ``SHA_DEPS`` + vérifie la cohérence tag↔Dockerfile
    (le Dockerfile référence-t-il une base cohérente ?) SANS réseau. Ne touche pas
    au registre. Sort 0 si cohérent. Le runner CI n'a ni registre air-gappé ni
    port-forward : il reste offline.
  • ONLINE (``--check-registry``, poste de contrôle) : EN PLUS, interroge le
    registre pour vérifier que ``pageviews-deps-base:<SHA_DEPS>`` existe. Si absente
    → ERREUR BLOQUANTE (les deps ont changé, la base n'a pas été rebuildée/poussée).

Le tag construit est LOGIQUE (``registry:80/pageviews-deps-base:<SHA_DEPS>``), mais
l'ENDPOINT d'interrogation est paramétrable (``--registry-endpoint`` / env
``REGISTRY_ENDPOINT``, défaut ``registry:80``) : depuis macOS le registre air-gappé
se joint via ``kubectl port-forward svc/registry <lport>:80`` → l'endpoint devient
``localhost:<lport>`` alors que le TAG garde ``registry:80/…`` (nom logique).

Outil d'interrogation (patron de ``cluster/scripts/audit-image-digests.sh``) :
``crane manifest <ref> --insecure`` de préférence (``registry:80`` est HTTP sans
auth), fallback ``docker manifest inspect <ref>``. Si aucun outil → exit 2. Un
endpoint injoignable donne un WARNING « ouvrir kubectl port-forward svc/registry
d'abord » (on DISTINGUE « registre injoignable » de « base absente »). Bonus : si
la base est présente mais N'EST PAS un index multi-arch (buildx ``--platform``) →
WARNING (dette digest mono-arch, ADR cluster 0006).

──────────────────────────────── EXIT CODES ──────────────────────────────────
(Patron cluster homogène — cf. ``check_topology.py``.)
  0 = OK (offline cohérent, ou online : base présente).
  1 = BLOQUANT MÉTIER : base absente au registre (mode online). Message
      pédagogique : les deps ont changé, rebuild + push la pré-image avant de
      déployer.
  2 = erreur de CONFIG : fichier source introuvable, ni crane ni docker.

NOTE : l'ADR 0110 §3 dit « alerte bloquante, exit non-zéro » ; on suit le patron
cluster HOMOGÈNE (exit 1 = bloquant métier, exit 2 = config) plutôt qu'un « exit 2 »
indistinct — c'est plus lisible en CI et cohérent avec check_topology.py.

Usage : python scripts/check_deps_base_freshness.py            (offline, défaut)
        python scripts/check_deps_base_freshness.py --print-tag
        python scripts/check_deps_base_freshness.py --check-registry \\
            --registry-endpoint localhost:5000
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass

# ── Localisation des entrées (le workspace de la code-location) ─────────────────
# scripts/ → le parent est dataops/pageviews-dagster/. On y trouve uv.lock, le
# Dockerfile et src/pageviews_dagster/model_provenance.py. Chemins DÉRIVÉS (pas de
# hard-code de racine de dépôt) : le check tourne au build atlas, cwd variable.
_WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Neutralité (ADR 0035) : le nom de la code-location est PARAMÉTRABLE. Défaut
# `pageviews` ; `mediawatch`/`pageviews` pourront réutiliser ce même calcul plus
# tard (leur deps-base a les mêmes entrées SAUF le modèle ONNX, absent chez eux —
# d'où model_provenance CONDITIONNEL à sa présence). ─────────────────────────────
_DEFAULT_CL = "pageviews"
_REGISTRY_ENDPOINT_DEFAULT = "registry:80"
# Nom LOGIQUE du registre embarqué dans le tag (jamais l'endpoint d'interrogation).
_REGISTRY_LOGICAL = "registry:80"

# MediaTypes acceptés comme INDEX multi-arch (repris d'audit-image-digests.sh).
_INDEX_TYPES = frozenset(
    {
        "application/vnd.oci.image.index.v1+json",
        "application/vnd.docker.distribution.manifest.list.v2+json",
    }
)

ERROR = "error"
WARNING = "warning"


@dataclass(frozen=True)
class Finding:
    """Un constat du check. `level` ∈ {error, warning} ; `error` ⇒ exit 1."""

    level: str
    message: str


# ═════════════════════════════════════════════════════════════════════════════
# FONCTIONS PURES (testées sans disque ni réseau)
# ═════════════════════════════════════════════════════════════════════════════


def extract_deps_stage(dockerfile_text: str) -> str:
    """Tranche `FROM … AS deps` … jusqu'à AVANT `FROM ${DEPS_REF} … AS code`. Pure.

    Repérée par des MARQUEURS (``AS deps`` / la ligne ``FROM`` de la cible ``code``),
    PAS par des numéros de ligne codés en dur : robuste à l'ajout/retrait d'étapes.
    On borne au premier ``FROM`` qui suit et qui introduit un AUTRE étage (``AS code``
    ou une consommation de ``${DEPS_REF}``) — c'est la frontière du cycle de vie
    disjoint (base figée / code frais). Hacher cette tranche entière capte le digest
    de ``python:3.10-slim``, l'apt, les extensions DuckDB, sans parsing fragile.

    Lève ``ValueError`` si les bornes sont introuvables (Dockerfile inattendu) : le
    contrat de hachage serait sinon silencieusement faux.
    """
    lines = dockerfile_text.splitlines()

    start = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Début de la cible `deps` : une instruction FROM … AS deps (insensible à
        # la casse du mot-clé, comme Docker).
        if stripped.upper().startswith("FROM ") and _from_stage_name(stripped) == "deps":
            start = i
            break
    if start is None:
        raise ValueError("Dockerfile : cible `deps` (FROM … AS deps) introuvable.")

    end = len(lines)
    for i in range(start + 1, len(lines)):
        stripped = lines[i].strip()
        if not stripped.upper().startswith("FROM "):
            continue
        # Frontière : le FROM qui ouvre la cible `code` (AS code) ou qui consomme la
        # pré-image publiée (${DEPS_REF}). C'est là que finit l'étage `deps`.
        stage_name = _from_stage_name(stripped)
        if stage_name == "code" or "${DEPS_REF}" in stripped or "$DEPS_REF" in stripped:
            end = i
            break
    else:
        raise ValueError(
            "Dockerfile : fin de la cible `deps` introuvable "
            "(ni `FROM ${DEPS_REF}` ni `AS code` après `AS deps`)."
        )

    # Tranche depuis `FROM … AS deps` (inclus) jusqu'à AVANT le FROM de `code`.
    return "\n".join(lines[start:end])


def _from_stage_name(from_line: str) -> str | None:
    """Nom d'étage d'une instruction ``FROM … AS <nom>`` (ou None). Pure.

    Insensible à la casse du mot-clé ``AS`` (Docker l'accepte dans les deux casses).
    """
    tokens = from_line.split()
    for i, tok in enumerate(tokens[:-1]):
        if tok.upper() == "AS":
            return tokens[i + 1]
    return None


def compute_sha_deps(
    uv_lock_text: str,
    deps_stage_text: str,
    model_provenance_text: str | None,
    *,
    length: int = 12,
) -> str:
    """``SHA_DEPS`` = sha256 tronqué des entrées de la cible ``deps``. Pure.

    Concaténation ORDONNÉE et ÉTIQUETÉE (déterministe, indépendante de l'ordre
    d'appel) : chaque entrée est préfixée d'un label et suivie d'un octet nul
    séparateur, ce qui évite toute ambiguïté de frontière entre contenus. Ordre
    figé : uv.lock, tranche Dockerfile `deps`, model_provenance.

    ``model_provenance_text`` est CONDITIONNEL (``None`` autorisé) : les
    code-locations sans modèle ONNX (mediawatch/pageviews) n'ont pas cette entrée —
    on ne l'inclut PAS dans le hash (plutôt qu'inclure une chaîne vide, qui serait
    indistinguable d'un fichier vide). Défaut ``pageviews`` → toujours présent.

    Tronqué à ``length`` hex (12 par défaut, comme un SHA git court du pipeline).
    """
    hasher = hashlib.sha256()

    def _feed(label: str, content: str) -> None:
        hasher.update(label.encode("utf-8"))
        hasher.update(b"\0")
        hasher.update(content.encode("utf-8"))
        hasher.update(b"\0")

    _feed("uv.lock", uv_lock_text)
    _feed("dockerfile:deps", deps_stage_text)
    if model_provenance_text is not None:
        _feed("model_provenance", model_provenance_text)

    return hasher.hexdigest()[:length]


def deps_base_tag(sha_deps: str, cl: str = _DEFAULT_CL, registry: str = _REGISTRY_LOGICAL) -> str:
    """Tag LOGIQUE immuable de la pré-image : ``<registry>/<cl>-deps-base:<SHA_DEPS>``.

    Le registre est le nom LOGIQUE (embarqué dans le tag, jamais l'endpoint
    d'interrogation). Pure — source de vérité unique du tag, partagée avec le build.
    """
    return f"{registry}/{cl}-deps-base:{sha_deps}"


def tag_for_endpoint(tag: str, endpoint: str, registry: str = _REGISTRY_LOGICAL) -> str:
    """Réécrit le PRÉFIXE registre d'un tag LOGIQUE vers l'endpoint d'interrogation. Pure.

    Le tag reste logique (``registry:80/…``) ; pour l'INTERROGER depuis macOS via
    ``kubectl port-forward svc/registry <lport>:80``, on substitue le préfixe par
    ``localhost:<lport>`` sans changer nom/tag. Endpoint == registre logique → no-op.
    """
    if endpoint == registry or not tag.startswith(registry + "/"):
        return tag
    return endpoint + "/" + tag[len(registry) + 1 :]


def classify_registry_result(
    tag: str,
    mediatype: str | None,
    reachable: bool,
) -> list[Finding]:
    """Traduit le résultat d'interrogation registre en constats. Pure.

    - ``reachable=False`` (endpoint injoignable) → WARNING (config poste : ouvrir le
      port-forward). On NE conclut PAS « base absente » : on ne sait pas.
    - joignable, ``mediatype=None`` (manifeste absent/illisible) → ERROR (exit 1) : la
      base ``<SHA_DEPS>`` n'existe pas → les deps ont changé, rebuild + push requis.
    - joignable, mediatype PRÉSENT mais NON-index → WARNING (mono-arch : dette digest
      ADR cluster 0006, buildx ``--platform`` manquant) — la base existe, on n'échoue
      pas dessus.
    - joignable, mediatype INDEX multi-arch → aucun constat (OK).
    """
    if not reachable:
        return [
            Finding(
                WARNING,
                f"registre injoignable pour {tag} — impossible de vérifier la présence de la "
                "pré-image. Depuis macOS, ouvrir d'abord "
                "`kubectl port-forward svc/registry <lport>:80` puis relancer avec "
                "`--registry-endpoint localhost:<lport>`. (« injoignable » ≠ « base absente ».)",
            )
        ]
    if mediatype is None:
        return [
            Finding(
                ERROR,
                f"pré-image ABSENTE au registre : {tag}. Les dépendances ont changé (uv.lock / "
                "Dockerfile:deps / provenance modèle) sans rebuild+push de la base. Builder puis "
                f"pousser la pré-image AVANT de déployer le code :\n"
                f"    docker buildx build --platform linux/arm64,linux/amd64 --target deps \\\n"
                f"      -f dataops/pageviews-dagster/Dockerfile -t {tag} --push dataops/\n"
                "puis relancer ce check.",
            )
        ]
    if mediatype not in _INDEX_TYPES:
        return [
            Finding(
                WARNING,
                f"pré-image {tag} présente mais mediaType '{mediatype}' NON-index (mono-arch) — "
                "attendu un index multi-arch (buildx `--platform linux/arm64,linux/amd64`). "
                "Dette digest mono-arch (ADR cluster 0006) : re-builder en multi-arch.",
            )
        ]
    return []


# ═════════════════════════════════════════════════════════════════════════════
# I/O — lecture des entrées et interrogation registre (NON pur ; injecté dans main)
# ═════════════════════════════════════════════════════════════════════════════


def _read_text(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def _inspect_mediatype(tag: str, endpoint: str) -> tuple[bool, str | None]:
    """Interroge le registre : ``(reachable, mediatype|None)``. NON pur (subprocess).

    Réutilise la détection crane/docker d'``audit-image-digests.sh`` :
      • ``crane manifest <ref> --insecure`` de préférence (``registry:80`` est HTTP
        sans auth) ; sa sortie JSON porte ``.mediaType``.
      • fallback ``docker manifest inspect <ref>`` (``.mediaType`` aussi).
    L'appelant garantit qu'AU MOINS un outil est présent (sinon exit 2 en amont).

    Distingue « endpoint injoignable » (reachable=False) de « manifeste absent »
    (reachable=True, mediatype=None) via le message d'erreur de l'outil : un refus de
    connexion / DNS échoué = injoignable ; un 404 / MANIFEST_UNKNOWN = base absente.
    """
    query_ref = tag_for_endpoint(tag, endpoint)
    if shutil.which("crane"):
        cmd = ["crane", "manifest", query_ref, "--insecure"]
    else:
        cmd = ["docker", "manifest", "inspect", "--insecure", query_ref]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return (False, None)

    if proc.returncode == 0:
        return (True, _mediatype_from_manifest(proc.stdout))

    # Échec : « injoignable » vs « absente » d'après le stderr de l'outil.
    stderr = (proc.stderr or "").lower()
    unreachable_markers = (
        "connection refused",
        "no such host",
        "could not resolve",
        "timeout",
        "timed out",
        "dial tcp",
        "connect: ",
        "network is unreachable",
        "i/o timeout",
    )
    if any(marker in stderr for marker in unreachable_markers):
        return (False, None)
    # 404 / MANIFEST_UNKNOWN / not found → joignable mais base absente.
    return (True, None)


def _mediatype_from_manifest(stdout: str) -> str | None:
    """Extrait ``.mediaType`` d'une sortie manifeste JSON (crane/docker). Best-effort."""
    import json

    try:
        data = json.loads(stdout)
    except (ValueError, TypeError):
        return None
    if isinstance(data, dict):
        mt = data.get("mediaType")
        return mt if isinstance(mt, str) and mt else None
    return None


def _load_inputs(workspace: str, cl: str) -> tuple[str, str, str | None]:
    """Lit les 3 entrées depuis le disque. NON pur. Lève ``FileNotFoundError`` /
    ``ValueError`` (propagées en exit 2 par main)."""
    uv_lock_text = _read_text(os.path.join(workspace, "uv.lock"))
    dockerfile_text = _read_text(os.path.join(workspace, "Dockerfile"))
    deps_stage_text = extract_deps_stage(dockerfile_text)

    # model_provenance CONDITIONNEL à sa présence (neutralité : mediawatch/pageviews
    # n'ont pas de modèle ONNX). Défaut `pageviews` → présent.
    provenance_path = os.path.join(
        workspace, "src", cl.replace("-", "_") + "_dagster", "model_provenance.py"
    )
    model_provenance_text = _read_text(provenance_path) if os.path.isfile(provenance_path) else None
    return uv_lock_text, deps_stage_text, model_provenance_text


# ═════════════════════════════════════════════════════════════════════════════
# ORCHESTRATION
# ═════════════════════════════════════════════════════════════════════════════


def _report(findings: list[Finding]) -> int:
    warnings = [f for f in findings if f.level == WARNING]
    errors = [f for f in findings if f.level == ERROR]

    for finding in warnings:
        print(f"check-deps-base: AVERTISSEMENT — {finding.message}", file=sys.stderr)
    for finding in errors:
        print(f"check-deps-base: ERREUR — {finding.message}", file=sys.stderr)

    if errors:
        print(
            f"\ncheck-deps-base: {len(errors)} constat(s) BLOQUANT(S) (ADR cluster 0110 §3), "
            f"{len(warnings)} avertissement(s). Rebuilder + pousser la pré-image "
            "`pageviews-deps-base:<SHA_DEPS>` avant de déployer le code.",
            file=sys.stderr,
        )
        return 1

    print(
        f"check-deps-base: OK ({len(warnings)} avertissement(s), 0 constat bloquant).",
        file=sys.stderr,
    )
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Garde-fou de fraîcheur de la pré-image de build (ADR cluster 0110).",
    )
    parser.add_argument(
        "--check-registry",
        action="store_true",
        default=_env_flag("CHECK_REGISTRY"),
        help="Mode ONLINE : interroge le registre (crane/docker) pour vérifier que la "
        "pré-image <SHA_DEPS> existe. Défaut : offline (env CHECK_REGISTRY active aussi).",
    )
    parser.add_argument(
        "--print-tag",
        action="store_true",
        help="Imprime le tag LOGIQUE (registry:80/<cl>-deps-base:<SHA_DEPS>) sur stdout et "
        "sort 0. Source de vérité unique du tag pour le script de build de la base.",
    )
    parser.add_argument(
        "--registry-endpoint",
        default=os.environ.get("REGISTRY_ENDPOINT", _REGISTRY_ENDPOINT_DEFAULT),
        help="Endpoint d'INTERROGATION du registre (env REGISTRY_ENDPOINT, défaut "
        "registry:80). Sur macOS via port-forward : localhost:<lport>. Le TAG garde "
        "toujours registry:80/… (nom logique).",
    )
    parser.add_argument(
        "--code-location",
        default=_DEFAULT_CL,
        help="Code-location (défaut pageviews). mediawatch/pageviews réutiliseront ce calcul.",
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
    """Orchestre le check : lit les entrées, calcule SHA_DEPS, vérifie la cohérence.

    OFFLINE (défaut) : calcule SHA_DEPS et confirme la cohérence tag↔Dockerfile (les
    entrées se lisent, la tranche `deps` s'extrait) — exit 0. ONLINE
    (``--check-registry``) : interroge en plus le registre — exit 1 si la base est
    absente. ``--print-tag`` court-circuite tout et imprime le tag (exit 0).

    Exit : 0 = OK, 1 = base absente (online), 2 = config (source introuvable, ni
    crane ni docker).
    """
    args = _build_parser().parse_args(argv)

    # ── Lecture des entrées + calcul SHA_DEPS (commun aux deux modes) ────────────
    try:
        uv_lock_text, deps_stage_text, model_provenance_text = _load_inputs(
            args.workspace, args.code_location
        )
    except FileNotFoundError as exc:
        print(
            f"check-deps-base: entrée introuvable ({exc}). Lancer depuis le dépôt atlas "
            "(workspace dataops/pageviews-dagster/).",
            file=sys.stderr,
        )
        return 2
    except ValueError as exc:
        print(f"check-deps-base: Dockerfile incohérent — {exc}", file=sys.stderr)
        return 2

    sha_deps = compute_sha_deps(uv_lock_text, deps_stage_text, model_provenance_text)
    tag = deps_base_tag(sha_deps, args.code_location)

    # ── --print-tag : source de vérité unique du tag, sort tout de suite ─────────
    if args.print_tag:
        print(tag)
        return 0

    # ── Mode OFFLINE : SHA_DEPS calculé, cohérence tag↔Dockerfile OK ─────────────
    if not args.check_registry:
        print(f"check-deps-base: SHA_DEPS={sha_deps}", file=sys.stderr)
        print(f"check-deps-base: tag logique = {tag}", file=sys.stderr)
        print(
            "check-deps-base: mode OFFLINE (pas d'interrogation registre). "
            "Ajouter --check-registry au poste pour vérifier la présence de la pré-image.",
            file=sys.stderr,
        )
        return _report([])

    # ── Mode ONLINE : interrogation du registre ─────────────────────────────────
    if not (shutil.which("crane") or shutil.which("docker")):
        print(
            "check-deps-base: ni `crane` ni `docker` disponible — impossible d'interroger le "
            "registre. Installer crane (préféré, `crane manifest --insecure`) ou docker.",
            file=sys.stderr,
        )
        return 2

    print(
        f"check-deps-base: SHA_DEPS={sha_deps} — interrogation registre pour {tag}",
        file=sys.stderr,
    )
    reachable, mediatype = _inspect_mediatype(tag, args.registry_endpoint)
    findings = classify_registry_result(tag, mediatype, reachable)
    return _report(findings)


if __name__ == "__main__":
    raise SystemExit(main())

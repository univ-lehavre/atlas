"""Sélection du DERNIER ``run=`` par récence S3 (``ModTime``), pas par ordre lexical.

Les ``run_id`` Dagster sont des ``uuid4`` **aléatoires** : ``max(run)`` / ``ORDER BY run``
élit un run **au hasard**, pas le plus récent (bug corrigé, ADR 0101). On ordonne par
``ModTime`` S3, **rétrocompatible** avec les ``run=`` uuid4 déjà écrits — immuables
(ADR 0054 : un ``run=`` n'est jamais réécrit, son ``ModTime`` = instant de sa production).
Les ex-æquo de ``ModTime`` sont départagés par ``run=`` lexical → ordre TOTAL
``(ModTime, run)`` stable, donc sélection **déterministe** pour un état S3 donné (ADR 0057).

**Complétude sans marqueur.** Un ``run=`` ne contient qu'un ``part.parquet`` écrit par un
``COPY`` DuckDB **atomique** (entier ou absent, jamais tronqué). La présence du part **est**
la sentinelle de complétude du run pour le mart servi — on n'ajoute aucun marqueur par
``run=`` (ce serait un nouveau point de coupure et casserait la rétrocompat).

Fonctions **pures**, sans I/O ni Dagster : elles prennent des entrées ``rclone lsjson``
déjà parsées (champs ``Path``, ``ModTime``, ``IsDir``). ``ModTime`` est un RFC 3339 à
précision variable (fraction jusqu'à la nanoseconde, décalage horaire) : on le **parse en
date** pour comparer, jamais comme chaîne. Un ``ModTime`` absent/illisible est traité comme
la date la plus ancienne possible — le run concerné ne l'emporte jamais par défaut.

NB : ``last_run.py`` est **dupliqué** à l'identique dans ``pageviews-dagster`` (jumeau) :
``dataops`` n'a pas de package Python partagé (ADR 0055).
"""

import datetime as _dt
import re

# Extrait (dt, run) d'un chemin de part servi : ``…/dt=<période>/run=<id>/…``.
_DT_RUN_RE = re.compile(r"dt=([^/]+)/run=([^/]+)/")

# Date « la plus ancienne » attribuée à un ModTime manquant : un run sans ModTime lisible
# ne doit jamais gagner un départage. Aware (UTC) pour rester comparable aux ModTime parsés.
_MIN = _dt.datetime.min.replace(tzinfo=_dt.timezone.utc)


def _parse_modtime(raw: str) -> _dt.datetime:
    """RFC 3339 rclone (décalage horaire, fraction ns) → ``datetime`` *aware*.

    Sur Python 3.10 (version épinglée du projet), ``datetime.fromisoformat`` ne gère **ni**
    le suffixe ``Z`` **ni** une fraction de plus de 6 chiffres — on normalise donc à la main :
    ``Z`` → ``+00:00`` et fraction tronquée à la microseconde (rclone émet jusqu'à 9 chiffres).
    ``""``/valeur illisible → ``_MIN`` (le plus ancien possible), pour qu'un run sans
    ``ModTime`` fiable ne l'emporte jamais par défaut."""
    if not raw:
        return _MIN
    # Tronque une fraction de seconde à 6 chiffres (µs) : "…:01.123456789Z" → "…:01.123456Z".
    text = re.sub(r"(\.\d{6})\d+", r"\1", raw)
    # fromisoformat (3.10) refuse le "Z" : le remplacer par un décalage explicite.
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = _dt.datetime.fromisoformat(text)
    except ValueError:
        return _MIN
    # Rend la date *aware* si rclone a omis le fuseau (ne devrait pas, mais robustesse).
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=_dt.timezone.utc)


def run_modtimes(entries: list[dict]) -> dict[tuple[str, str], _dt.datetime]:
    """Indexe ``{(dt, run): ModTime max}`` sur les parts ``.parquet`` (PUR).

    Un ``run=`` peut porter plusieurs parts (``part-0``, ``part-1``…) : on retient le
    ``ModTime`` **maximal** du run (instant où il a fini d'écrire). ``entries`` = sortie
    ``rclone lsjson -R`` (champs ``Path``, ``ModTime``, ``IsDir``). Une entrée sans
    ``dt=``/``run=`` reconnaissable, un dossier ou un non-``.parquet`` est ignoré."""
    acc: dict[tuple[str, str], _dt.datetime] = {}
    for e in entries:
        path = e.get("Path", "")
        if e.get("IsDir", False) or not path.endswith(".parquet"):
            continue
        m = _DT_RUN_RE.search(path)
        if not m:
            continue
        key = (m.group(1), m.group(2))
        mt = _parse_modtime(e.get("ModTime", ""))
        if key not in acc or mt > acc[key]:
            acc[key] = mt
    return acc


def latest_run_by_day(entries: list[dict]) -> dict[str, str]:
    """``{dt: run le plus RÉCENT}`` par ``ModTime`` (ex-æquo → ``run`` lexical max) (PUR).

    Remplace le ``max(run)`` lexical de ``manifest.latest_run_parts`` et du CTE ``latest``
    SQL du forecast. Un ``dt`` n'apparaît que s'il a au moins une part. Ordre total de
    sélection : la clé ``(modtime, run)``."""
    best: dict[str, tuple[_dt.datetime, str]] = {}
    for (dt, run), mt in run_modtimes(entries).items():
        cand = (mt, run)
        if dt not in best or cand > best[dt]:
            best[dt] = cand
    return {dt: run for dt, (_mt, run) in best.items()}


def previous_complete_run(entries: list[dict], current_run: str) -> str | None:
    """``run`` le plus récent **strictement antérieur** à ``current_run`` (PUR) — le ``N-1``.

    « Antérieur » = clé ``(ModTime, run)`` strictement inférieure à celle du run courant,
    dans le **même** ordre total que la sélection « dernier ». ``None`` si ``current_run``
    est le premier run (aucun antérieur) ou est absent des entrées. Le run courant ``N``,
    venant d'être écrit, porte le ``ModTime`` maximal : « le run juste avant ``N`` » est
    donc bien son vrai prédécesseur."""
    mods = run_modtimes(entries)
    current_mods = [mt for (_dt_, run), mt in mods.items() if run == current_run]
    if not current_mods:
        return None
    current_key = (max(current_mods), current_run)
    earlier = [
        (mt, run)
        for (_dt_, run), mt in mods.items()
        if run != current_run and (mt, run) < current_key
    ]
    return max(earlier)[1] if earlier else None

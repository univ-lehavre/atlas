"""Tests de la sélection du dernier run par récence ``ModTime`` (fonctions pures, ADR 0101).

Le point verrouillé : l'ordre ``ModTime`` doit primer sur l'ordre lexical du ``run=``
(uuid4 aléatoire). Les fixtures font donc DIVERGER les deux — le run au ``ModTime`` le plus
récent doit gagner même quand il est lexicographiquement inférieur. Un tel test échoue sur
l'ancien code (``ORDER BY run`` + ``previous[-1]``) et passe sur le nouveau : preuve du fix.

citation n'exerce que la sélection ``N-1`` du drift (``previous_complete_run``) ; le module
n'inclut donc pas ``latest_run_by_day`` (utilisé par le manifest de mediawatch/pageviews).
"""

import datetime as dt

from citation_dagster import last_run as lr


def _part(dt_key: str, run: str, modtime: str, size: int = 1) -> dict:
    return {
        "Path": f"dt={dt_key}/run={run}/part.parquet",
        "Size": size,
        "IsDir": False,
        "ModTime": modtime,
    }


# ── _parse_modtime : robustesse RFC 3339 sur Python 3.10 ─────────────────────


def test_parse_modtime_handles_z_suffix() -> None:
    # fromisoformat (3.10) refuse le "Z" brut : _parse_modtime doit le normaliser.
    parsed = lr._parse_modtime("2026-01-01T12:00:00Z")
    assert parsed == dt.datetime(2026, 1, 1, 12, 0, tzinfo=dt.timezone.utc)


def test_parse_modtime_truncates_nanoseconds() -> None:
    # rclone émet jusqu'à 9 chiffres de fraction ; fromisoformat (3.10) n'en gère que 6.
    parsed = lr._parse_modtime("2026-01-01T12:00:00.123456789Z")
    assert parsed.microsecond == 123456
    assert parsed.tzinfo is not None


def test_parse_modtime_accepts_explicit_offset() -> None:
    parsed = lr._parse_modtime("2026-01-01T12:00:00+00:00")
    assert parsed == dt.datetime(2026, 1, 1, 12, 0, tzinfo=dt.timezone.utc)


def test_parse_modtime_missing_or_garbage_is_min() -> None:
    # Un ModTime absent/illisible = la date la plus ancienne → ne gagne jamais un départage.
    assert lr._parse_modtime("") == lr._MIN
    assert lr._parse_modtime("pas-une-date") == lr._MIN


# ── run_modtimes : indexation (dt, run) → ModTime max ────────────────────────


def test_run_modtimes_takes_max_modtime_across_parts_of_a_run() -> None:
    # Un run= peut porter plusieurs parts : on retient le ModTime le PLUS RÉCENT du run.
    entries = [
        _part("0000-00", "AAA", "2026-01-01T12:00:00Z"),
        {
            "Path": "dt=0000-00/run=AAA/part-1.parquet",
            "Size": 1,
            "IsDir": False,
            "ModTime": "2026-01-01T12:05:00Z",
        },
    ]
    mods = lr.run_modtimes(entries)
    assert mods[("0000-00", "AAA")] == dt.datetime(2026, 1, 1, 12, 5, tzinfo=dt.timezone.utc)


def test_run_modtimes_ignores_dirs_and_non_parquet() -> None:
    entries = [
        _part("0000-00", "AAA", "2026-01-01T12:00:00Z"),
        {"Path": "dt=0000-00/run=AAA", "Size": 0, "IsDir": True, "ModTime": "…"},
        {"Path": "dt=0000-00/run=AAA/_manifest.json", "Size": 5, "IsDir": False, "ModTime": "…"},
    ]
    assert set(lr.run_modtimes(entries)) == {("0000-00", "AAA")}


def test_run_modtimes_ignores_unparseable_path() -> None:
    entries = [{"Path": "garbage.parquet", "Size": 1, "IsDir": False, "ModTime": "…"}]
    assert lr.run_modtimes(entries) == {}


# ── previous_complete_run : le N-1 du drift ──────────────────────────────────


def test_previous_complete_run_is_the_real_predecessor_by_modtime() -> None:
    # N courant "aaa" (lexical MIN) est le plus récent (vient d'être écrit). Le N-1 doit être
    # "zzz" (juste avant par ModTime), PAS un artefact de l'ordre lexical.
    entries = [
        _part("0000-00", "mmm", "2026-01-01T08:00:00Z"),
        _part("0000-00", "zzz", "2026-01-01T10:00:00Z"),  # N-1 attendu
        _part("0000-00", "aaa", "2026-01-01T12:00:00Z"),  # N courant
    ]
    assert lr.previous_complete_run(entries, "aaa") == "zzz"


def test_previous_complete_run_none_for_first_run() -> None:
    entries = [_part("0000-00", "aaa", "2026-01-01T12:00:00Z")]
    assert lr.previous_complete_run(entries, "aaa") is None


def test_previous_complete_run_none_when_current_absent() -> None:
    entries = [_part("0000-00", "aaa", "2026-01-01T12:00:00Z")]
    assert lr.previous_complete_run(entries, "inconnu") is None

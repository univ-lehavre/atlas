"""Asset d'ingestion : collecte des VUES MENSUELLES Wikipédia par établissement.

Pour chaque ``(university_id, lang, title)`` du **référentiel** ``ref_universities``
(résolu en amont depuis Wikidata/OpenAlex), somme les vues mensuelles de la page —
**titre courant + redirections** — et écrit la série ``(university_id, month, views)``
(``month`` au format ``AAAAMM``) en Parquet sous ``raw/pageviews/dt=<mois>/run=<run>/``
du lakehouse.

**Source = HTTP** (comme mediawatch/GDELT, pas un sync S3→S3). En cible, le grain
métier vient des dumps mensuels ``pageview_complete`` de Wikimedia ; en **proto**, on
interroge l'**API REST Pageviews** (``/metrics/pageviews/per-article/…/monthly/…``),
qui expose déjà le grain mensuel par article — d'où un fetcher HTTP injectable plutôt
qu'un download de dump. La résolution des **redirections** (une vue peut frapper l'URL
canonique OU une redirection : les deux comptent pour l'établissement) passe par l'API
MediaWiki (``action=query&prop=redirects``). rclone reste réservé à l'écriture
lakehouse (un seul remote ``ceph``).

**Watermark d'ingestion incrémentale.** Le watermark mémorise, par clé de référentiel,
le **dernier mois collecté** (``AAAAMM``). Un run ne (re)collecte que les mois
strictement postérieurs, jusqu'au dernier mois COMPLET (le mois courant est exclu tant
qu'il n'est pas révolu — une valeur partielle fausserait la série et le modèle). Le
watermark n'avance qu'**après** une écriture réussie (reprise idempotente sur échec).

**Corps purs séparés de la glue.** Toute l'agrégation (fenêtre de mois à collecter,
somme titre+redirections, pliage en série ``(university_id, month, views)``, tri
déterministe) est **pure** (aucune I/O) et unit-testable ; l'asset n'orchestre que le
HTTP (fetcher injecté) et le S3 (lakehouse + watermark rclone).

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution (les corps purs vivent dans ce module mais l'asset lui-même
est introspecté ; on reste homogène, drift D9).
"""

import json
import os
import subprocess
import tempfile
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import httpx
from dagster import (
    AssetKey,
    Config,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from pageviews_dagster import lakehouse, lineage
from pageviews_dagster.resources import (
    ceph_target_from_env,
    render_rclone_config,
)

# ── Sources externes (en prose uniquement ; jamais dans un identifiant interne, ADR 0035) ──
# API REST Pageviews (grain mensuel par article) et API MediaWiki (redirections).
_PAGEVIEWS_API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article"
_MEDIAWIKI_API = "https://{lang}.wikipedia.org/w/api.php"
# En-tête de courtoisie exigé par l'API Wikimedia (contact technique, pas de PII).
_USER_AGENT = "atlas-pageviews-dagster/1.0 (dataops ingestion)"

# Clé du watermark : dernier mois COLLECTÉ par source de référentiel (``seed`` / ``ingested``).
# Deux sources de référentiel avancent indépendamment (test hermétique vs prod).
_WATERMARK_KEY = "raw/_watermark.json"


# ─────────────────────────── Corps purs (aucune I/O) ───────────────────────────


@dataclass(frozen=True)
class WikiTitle:
    """Une ligne du référentiel : un établissement et sa page Wikipédia (langue + titre)."""

    university_id: str
    lang: str
    title: str


@dataclass(frozen=True)
class MonthlyViews:
    """Vues mensuelles d'UN article (canonique ou redirection), grain ``AAAAMM``."""

    month: str  # AAAAMM
    views: int


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    """Décale ``(year, month)`` de ``delta`` mois (delta signé). Pur, sans dépendance."""
    index = (year * 12 + (month - 1)) + delta
    return index // 12, index % 12 + 1


def last_complete_month(today: date) -> str:
    """Dernier mois RÉVOLU au format ``AAAAMM`` (le mois courant est exclu : partiel).

    Un mois n'est collecté que lorsqu'il est terminé — sinon la valeur de vues serait
    tronquée (cumul partiel) et fausserait la série mensuelle et son modèle.
    """
    year, month = _shift_month(today.year, today.month, -1)
    return f"{year:04d}{month:02d}"


# Profondeur de bootstrap (mois) quand aucun watermark n'existe ET que ``max_months``
# ne borne pas : 36 mois donnent au modèle 3 cycles annuels (MIN_HISTORY=12 lags à 12) —
# assez de saisonnalité sans backfill géant. Un run incrémental normal n'y touche pas.
_BOOTSTRAP_MONTHS = 36


def months_to_collect(after: str | None, until: str, max_months: int) -> list[str]:
    """Mois ``AAAAMM`` à collecter ce run : ``> after`` et ``<= until``, triés et bornés.

    - ``after`` = watermark (dernier mois déjà collecté) ; ``None`` au premier run.
    - ``until`` = dernier mois complet (cf. ``last_complete_month``).
    - ``max_months <= 0`` = illimité (prod) ; le banc pose une petite valeur (overlay).

    **Incrémental** (``after`` posé) : on part du mois SUIVANT le watermark et on comble
    dans l'ordre chronologique — le watermark avance de proche en proche, jamais de saut ;
    ``max_months`` tronque alors les plus ANCIENS (on remonte le retard par le début).

    **Bootstrap** (``after is None``) : fenêtre des N mois les plus RÉCENTS jusqu'à
    ``until``, avec ``N = max_months`` si borné, sinon ``_BOOTSTRAP_MONTHS`` (pas de
    rattrapage géant en une passe ; les runs suivants remontent au besoin via l'overlay).

    Tri lexicographique de ``AAAAMM`` = ordre chronologique.
    """
    if after is not None and until <= after:
        return []  # déjà à jour au dernier mois complet
    if after is not None:
        start = _month_add(after, 1)
    else:
        depth = max_months if max_months > 0 else _BOOTSTRAP_MONTHS
        start = _month_add(until, -(depth - 1))
    months: list[str] = []
    cursor = start
    while cursor <= until:
        months.append(cursor)
        cursor = _month_add(cursor, 1)
    return months if max_months <= 0 else months[:max_months]


def _month_add(month: str, delta: int) -> str:
    """``AAAAMM`` + ``delta`` mois → ``AAAAMM`` (arithmétique de calendrier pure)."""
    year, mon = _shift_month(int(month[:4]), int(month[4:]), delta)
    return f"{year:04d}{mon:02d}"


def aggregate_views(
    titles: list[WikiTitle],
    fetched: dict[tuple[str, str], list[MonthlyViews]],
    wanted_months: set[str],
) -> list[dict[str, object]]:
    """Agrège la série ``(university_id, month, views)`` par établissement (I/O-free).

    ``fetched`` mappe ``(lang, title)`` (la page d'un établissement du référentiel) vers
    ses vues mensuelles DÉJÀ FUSIONNÉES (titre canonique + redirections — le fetcher a
    replié les redirections dans cette même série : une vue frappant l'URL canonique ou
    une redirection compte pour l'établissement ; cf. ``_fetch_title_views``).

    Plusieurs lignes du référentiel peuvent viser le même établissement (p. ex. sa page
    dans deux langues) : on SOMME toutes ces séries par ``(university_id, month)``. Ne
    conserve que les mois de ``wanted_months`` (fenêtre incrémentale) et **omet** les
    ``(university_id, month)`` sans aucune vue (pas de zéro fabriqué : le staging dbt
    décide du remplissage). Résultat **trié** ``(university_id, month)`` (déterminisme,
    ADR 0057) — chaque ligne est un dict prêt pour l'écriture Parquet.
    """
    sums: dict[tuple[str, str], int] = {}
    for wt in titles:
        for mv in fetched.get((wt.lang, wt.title), []):
            if mv.month in wanted_months:
                key = (wt.university_id, mv.month)
                sums[key] = sums.get(key, 0) + mv.views
    return [
        {"university_id": uid, "month": month, "views": views}
        for (uid, month), views in sorted(sums.items())
        if views > 0
    ]


def parse_pageviews_response(payload: dict, wanted_months: set[str]) -> list[MonthlyViews]:
    """Projette la réponse de l'API REST Pageviews en ``MonthlyViews`` (grain mensuel).

    Réponse : ``{"items": [{"timestamp": "AAAAMM0100", "views": N}, …]}``. Le timestamp
    mensuel est ``AAAAMM0100`` (jour/heure à 0100) : on n'en garde que ``AAAAMM``. On
    ignore les items hors ``wanted_months`` et les entrées malformées (défensif : l'API
    peut renvoyer un mois vide ou un item sans ``views``).
    """
    out: list[MonthlyViews] = []
    for item in payload.get("items", []):
        stamp = str(item.get("timestamp", ""))
        views = item.get("views")
        if len(stamp) < 6 or not isinstance(views, (int, float)):
            continue
        month = stamp[:6]
        if month in wanted_months:
            out.append(MonthlyViews(month=month, views=int(views)))
    return out


def parse_redirects_response(payload: dict) -> list[str]:
    """Extrait les titres de redirection d'une réponse MediaWiki ``prop=redirects``.

    Forme : ``{"query": {"pages": {<pageid>: {"redirects": [{"title": …}, …]}}}}``.
    Défensif : renvoie ``[]`` si la structure est absente (page sans redirection).
    """
    titles: list[str] = []
    pages = payload.get("query", {}).get("pages", {})
    for page in pages.values():
        for redirect in page.get("redirects", []):
            title = redirect.get("title")
            if isinstance(title, str) and title:
                titles.append(title)
    return sorted(set(titles))


# ─────────────────────────── Config de l'asset ───────────────────────────


class RawPageviewsConfig(Config):
    """Paramètres de la collecte incrémentale des vues mensuelles."""

    max_months: int = 0
    """Nombre maximal de mois collectés **par run** (fenêtre incrémentale).

    ``0`` = illimité (prod : rattrape tout l'historique postérieur au watermark). Le banc
    pose une petite valeur (overlay run_config) pour un run léger ; le watermark avançant
    de proche en proche, le run suivant reprend là où le précédent s'est arrêté.
    """

    include_redirects: bool = True
    """Sommer aussi les vues des redirections (page principale + alias).

    ``True`` (défaut) : une vue frappant une redirection compte pour l'établissement.
    ``False`` : seul le titre canonique (proto minimal / débogage)."""

    min_interval_s: float = 0.2
    """Délai minimal entre deux requêtes HTTP (throttle courtoisie envers l'API Wikimedia)."""

    max_attempts: int = 4
    """Tentatives par requête (retry sur 429/5xx avec backoff)."""


# ─────────────────────────── Glue HTTP (fetcher injectable) ───────────────────────────


_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class _Fetcher:
    """Client HTTP throttlé + retry/backoff pour les API Wikimedia.

    ``get_json`` applique un throttle (``min_interval_s`` entre requêtes) et un retry
    avec backoff exponentiel sur 429/5xx ou erreur réseau transitoire. ``get`` et
    ``sleep`` sont injectables pour des tests déterministes (aucune attente/réseau réel).
    """

    def __init__(
        self,
        config: RawPageviewsConfig,
        *,
        get: Callable[..., httpx.Response] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self._config = config
        self._get = get or httpx.get
        self._sleep = sleep
        self._monotonic = monotonic
        self._last_at: float | None = None

    def _throttle(self) -> None:
        if self._last_at is not None:
            wait = self._config.min_interval_s - (self._monotonic() - self._last_at)
            if wait > 0:
                self._sleep(wait)
        self._last_at = self._monotonic()

    def get_json(self, url: str, params: dict | None = None) -> dict:
        """GET JSON avec throttle + retry/backoff. ``{}`` sur 404 (article/mois absent)."""
        attempts = self._config.max_attempts
        for attempt in range(1, attempts + 1):
            self._throttle()
            try:
                resp = self._get(
                    url, params=params, headers={"User-Agent": _USER_AGENT}, timeout=60.0
                )
            except httpx.TransportError:
                if attempt >= attempts:
                    raise
            else:
                if resp.status_code == 404:
                    return {}  # article inexistant ce mois-là : série vide, pas une erreur
                if resp.status_code not in _RETRYABLE_STATUS:
                    resp.raise_for_status()
                    return resp.json()
            if attempt < attempts:
                self._sleep(min(2.0 ** (attempt - 1), 60.0))
        raise Failure(description=f"Échec HTTP après {attempts} tentatives : {url}")


def _resolve_redirects(fetcher: _Fetcher, wt: WikiTitle) -> list[str]:
    """Titres de redirection pointant vers la page de ``wt`` (via l'API MediaWiki)."""
    payload = fetcher.get_json(
        _MEDIAWIKI_API.format(lang=wt.lang),
        params={
            "action": "query",
            "format": "json",
            "prop": "redirects",
            "rdlimit": "max",
            "titles": wt.title,
        },
    )
    return parse_redirects_response(payload)


def _fetch_article_views(
    fetcher: _Fetcher, lang: str, article: str, first: str, last: str, wanted: set[str]
) -> list[MonthlyViews]:
    """Vues mensuelles d'UN article sur ``[first, last]`` (bornes ``AAAAMM``)."""
    project = f"{lang}.wikipedia"
    encoded = article.replace(" ", "_")
    url = (
        f"{_PAGEVIEWS_API}/{project}/all-access/all-agents/{encoded}/monthly/{first}0100/{last}0100"
    )
    return parse_pageviews_response(fetcher.get_json(url), wanted)


def _fetch_title_views(
    fetcher: _Fetcher, wt: WikiTitle, months: list[str], include_redirects: bool
) -> list[MonthlyViews]:
    """Vues mensuelles de la page de ``wt`` = titre canonique + (option) redirections.

    Fusionne dans UNE série ``(lang, title)`` la somme des vues du titre canonique et de
    chacune de ses redirections, mois par mois. Le rattachement redirection→établissement
    est ainsi porté ici (I/O) ; le corps pur ``aggregate_views`` n'a plus qu'à sommer par
    établissement les séries qu'on lui remet.
    """
    wanted = set(months)
    first, last = months[0], months[-1]
    articles = [wt.title]
    if include_redirects:
        articles += _resolve_redirects(fetcher, wt)
    per_month: dict[str, int] = {}
    for article in articles:
        for mv in _fetch_article_views(fetcher, wt.lang, article, first, last, wanted):
            per_month[mv.month] = per_month.get(mv.month, 0) + mv.views
    return [MonthlyViews(month=m, views=v) for m, v in sorted(per_month.items())]


# ─────────────────────────── Glue S3 (référentiel, watermark, écriture) ───────────────────────────


def _read_referential(con, bucket: str, ref_source: str) -> list[WikiTitle]:
    """Lit le référentiel ``ref/universities`` (source ``seed``/``ingested``) du lakehouse.

    Attendu : ``(university_id, lang, title)`` par établissement×page. Délégué à DuckDB
    (``lakehouse.read_parquet``) ; monkeypatchable en test (pas de vrai S3).
    """
    glob = lakehouse.referential_glob(bucket, ref_source)
    rows = lakehouse.read_parquet(con, glob, hive=False).fetchall()
    return [WikiTitle(university_id=str(r[0]), lang=str(r[1]), title=str(r[2])) for r in rows]


def _read_watermark(bucket: str, key: str, config_path: Path) -> str | None:
    """Dernier mois collecté pour ``key`` (``None`` si absent/illisible : premier run)."""
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "cat", f"ceph:{bucket}/{_WATERMARK_KEY}"],
        capture_output=True,
        text=True,
        check=False,
    )
    raw = result.stdout.lstrip("﻿").strip()
    if result.returncode != 0 or not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    value = data.get(key) if isinstance(data, dict) else None
    return value if isinstance(value, str) else None


def _write_watermark(bucket: str, key: str, month: str, config_path: Path) -> None:
    """Avance le watermark de ``key`` à ``month`` (read-modify-write JSON, séquentiel).

    Read-modify-write NON atomique : valable tant que l'asset s'exécute en séquence (un
    seul réplica). À n'appeler qu'après une écriture Parquet réussie (reprise idempotente).
    """
    dest = f"ceph:{bucket}/{_WATERMARK_KEY}"
    read = subprocess.run(
        ["rclone", "--config", str(config_path), "cat", dest],
        capture_output=True,
        text=True,
        check=False,
    )
    data: dict = {}
    raw = read.stdout.lstrip("﻿").strip()
    if read.returncode == 0 and raw:
        try:
            parsed = json.loads(raw)
            data = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            data = {}
    data[key] = month
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", dest],
        input=json.dumps(data, sort_keys=True),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise Failure(
            description=f"Écriture du watermark échouée pour « {key} »",
            metadata={"stderr": MetadataValue.text(result.stderr[-500:])},
        )


def _write_raw(con, rows: list[dict[str, object]], bucket: str, run_id: str) -> None:
    """Écrit la série ``(university_id, month, views)`` en Parquet partitionné par ``dt``.

    Chemin : ``raw/pageviews/dt=<mois>/run=<run_id>/`` — un ``dt`` par mois collecté
    (partition Hive), immuable par ``run=`` (un rejeu écrit un nouveau préfixe, ADR 0057).
    La colonne ``dt`` (= ``month``) est dérivée pour le partitionnement puis portée par le
    chemin Hive ; ``month`` reste dans les données (contrat consommé par le staging dbt).
    Délégué à ``lakehouse.copy_to_parquet`` ; monkeypatchable en test.
    """
    values = ",\n".join(
        f"({_sql_str(r['university_id'])}, {_sql_str(r['month'])}, "
        f"{int(r['views'])}, {_sql_str(r['month'])})"
        for r in rows
    )
    select_sql = f"SELECT * FROM (VALUES\n{values}\n) AS t(university_id, month, views, dt)"
    dest = f"s3://{bucket}/raw/pageviews/run={run_id}"
    lakehouse.copy_to_parquet(con, select_sql, dest, partition_by=["dt"])


def _sql_str(value: object) -> str:
    """Littéral chaîne SQL sûr (guillemet simple échappé) — les ids du référentiel sont
    des codes neutres, mais on échappe par principe (jamais de contenu utilisateur brut)."""
    return "'" + str(value).replace("'", "''") + "'"


# ─────────────────────────── Asset ───────────────────────────


@asset(
    name="raw_pageviews",
    group_name="ingestion",
    deps=[AssetKey(["ref_universities"])],
)
def raw_pageviews(context, config: RawPageviewsConfig) -> MaterializeResult:
    """Collecte incrémentale des vues mensuelles Wikipédia par établissement → ``raw/pageviews``.

    Lit le référentiel ``ref_universities`` (``(university_id, lang, title)``), fetch les
    vues mensuelles (titre + redirections) sur la fenêtre postérieure au watermark, agrège
    en ``(university_id, month, views)`` et écrit le Parquet brut. Fait avancer le watermark
    au dernier mois écrit.
    """
    target = ceph_target_from_env()
    run_id = context.run_id
    ref_source = os.environ.get("PAGEVIEWS_REF_SOURCE", "seed")
    fetcher = _Fetcher(config)

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        con = lakehouse.connect()
        titles = _read_referential(con, target.bucket, ref_source)
        if not titles:
            raise Failure(description=f"Référentiel vide : ref/universities (source={ref_source})")

        after = _read_watermark(target.bucket, ref_source, config_path)
        until = last_complete_month(date.today())
        months = months_to_collect(after, until, config.max_months)
        if not months:
            # Rien de neuf (déjà à jour au dernier mois complet) : run idempotent, no-op.
            return _empty_result(ref_source, after, until)

        wanted = set(months)
        lineage.emit(RunState.START, run_id, "raw_pageviews", [lineage.source_dataset()], [])

        fetched: dict[tuple[str, str], list[MonthlyViews]] = {}
        for wt in titles:
            fetched[(wt.lang, wt.title)] = _fetch_title_views(
                fetcher, wt, months, config.include_redirects
            )

        rows = aggregate_views(titles, fetched, wanted)
        if rows:
            _write_raw(con, rows, target.bucket, run_id)
            _write_watermark(target.bucket, ref_source, max(months), config_path)

        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "raw_pageviews",
            [lineage.source_dataset()],
            [lineage.raw_dataset()],
        )

    n_series = len({r["university_id"] for r in rows})
    n_obs = len(rows)
    n_months = len({r["month"] for r in rows})
    return MaterializeResult(
        metadata={
            "n_series": MetadataValue.int(n_series),
            "n_obs": MetadataValue.int(n_obs),
            "n_months": MetadataValue.int(n_months),
            "months": MetadataValue.text(f"{months[0]}..{months[-1]}"),
            "ref_source": MetadataValue.text(ref_source),
            "watermark": MetadataValue.text(max(months) if rows else (after or "—")),
            "bucket": MetadataValue.text(f"{target.bucket}/raw/pageviews"),
        }
    )


def _empty_result(ref_source: str, after: str | None, until: str) -> MaterializeResult:
    """Résultat d'un run à jour (aucun mois neuf à collecter)."""
    return MaterializeResult(
        metadata={
            "n_series": MetadataValue.int(0),
            "n_obs": MetadataValue.int(0),
            "n_months": MetadataValue.int(0),
            "months": MetadataValue.text("—"),
            "ref_source": MetadataValue.text(ref_source),
            "watermark": MetadataValue.text(after or "—"),
            "up_to_date_until": MetadataValue.text(until),
        }
    )

"""Asset d'ingestion du RÉFÉRENTIEL d'établissements (grain amont du pipeline).

Construit la table pivot qui relie un **établissement** à ses **titres d'article
encyclopédique** (par langue), pour que l'aval sache QUELLES pages compter. Deux
sources ouvertes sont jointes par un identifiant d'organisation partagé (ROR) :

- un **catalogue d'organisations de recherche** (SNAPSHOT S3 public, entité
  ``institutions`` en Parquet, filtre ``type=education``) qui donne, pour chaque
  établissement, son ROR, son pays et une bande de volume de publications ;
- une **base de connaissances collaborative** (SPARQL) qui, à partir du même ROR
  (propriété ``P6782``), donne l'identifiant de l'entité (``qid``) et ses **titres
  d'article multilingues** (un par langue de projet encyclopédique).

Le résultat, écrit en Parquet sous ``raw/ref_universities``, porte une ligne par
``(university_id, lang)`` : c'est l'entrée de la couche curated qui, elle, ira
compter les vues mensuelles de chaque titre (API Pageviews / dumps
``pageview_complete``).

**Neutralité (ADR 0035).** Les sources (catalogue ROR, base collaborative Wikidata,
projets Wikipédia, catalogue OpenAlex) ne sont NOMMÉES qu'en prose : les identifiants
internes restent ``pageviews`` / ``ref_universities`` (jamais « wikipedia » ni
« openalex » dans un nom d'objet — ce sont les SOURCES).

**Piège des renommages.** Un article peut avoir été RENOMMÉ : l'ancien titre porté
par la base de connaissances devient une **redirection**. Compter les vues sur un
titre obsolète sous-estime le trafic (le trafic réel s'accumule sur la cible). On
RÉSOUT donc chaque titre vers sa cible canonique avant de l'écrire (``_resolve_titles``).

**Échelle (drift D27).** Le catalogue d'établissements est lu du **snapshot S3**
(``institutions`` en Parquet, rapatrié par rclone puis interrogé en DuckDB local),
JAMAIS de l'API REST : à l'échelle prod (~24 700 établissements ``type=education``)
la pagination de l'API rate-limitait (HTTP 429). Wikidata (SPARQL) et Wikipédia
(résolution de redirections) restent en HTTP via un ``_Fetcher`` injectable. Les corps
de parsing/SQL sont **purs** (aucune I/O), donc testables sans réseau ni S3.

NB : pas de ``from __future__ import annotations`` — Dagster introspecte les
annotations des assets à l'exécution (drift D9 ; le cœur pur ``forecast_model`` peut,
lui, la porter — pas les assets).
"""

import json
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import duckdb
from dagster import Config, Failure, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState
from pydantic import Field

from pageviews_dagster import lakehouse, lineage
from pageviews_dagster.resources import ceph_target_from_env, render_rclone_config

# ── Sources externes (en PROSE uniquement ; jamais dans un identifiant interne) ──
# Catalogue d'organisations de recherche : le SNAPSHOT S3 public (AWS Open Data),
# entité ``institutions`` en Parquet colonnaire (``data/parquet/<entity>``, publié
# 2024+). RAPATRIÉ par rclone (remote ``openalex`` anonyme) puis lu en LOCAL par DuckDB,
# JAMAIS via l'API REST : l'API rate-limite (429) sous la pagination à l'échelle prod
# (des dizaines de milliers d'établissements). Le snapshot fait ~91 Mio en 137 petits
# fichiers → rclone les copie en parallèle (~5 s) là où un httpfs direct enchaîne 137
# aller-retours S3 (>2 min). Même source que ``citation`` pour works/authors.
# Partitionné par ``updated_date`` : le catalogue courant = dédup par ``id`` en gardant
# la partition la PLUS RÉCENTE (un établissement réapparaît dans la partition de sa
# dernière mise à jour). Filtre ``type='education'`` (+ pays) poussé en SQL.
_OPENALEX_INSTITUTIONS_SRC = "openalex:openalex/data/parquet/institutions"
# Point d'accès SPARQL de la base de connaissances collaborative. La requête part du
# ROR (propriété P6782) et remonte le qid + les libellés d'article par site linguistique.
_WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
# API Action des projets encyclopédiques (``action=query``) : RÉSOUT les titres vers leur
# cible de redirection (``redirects=1``) — piège des renommages. BATCHABLE (contrairement au
# REST unitaire ``/page/{titre}``) : jusqu'à 50 titres par requête, mapping rendu dans
# ``query.normalized[]`` (casse/underscore) PUIS ``query.redirects[]`` (renommage).
_WIKIPEDIA_ACTION_API = "https://{lang}.wikipedia.org/w/api.php"

_HTTP_TIMEOUT = 120.0
# Taille de lot de la RÉSOLUTION des redirections (drift D27 §3). L'API Action accepte 50
# titres MAX par requête (limite vérifiée : 51 → 0 page). On résout donc par lots de 50 en
# UNE requête ``action=query&redirects=1`` — 15 302 titres deviennent ~306 requêtes (÷50).
# C'est la clé DOUBLE : ~50× moins d'appels (donc de résolutions DNS → plus de BURST qui
# écroulait CoreDNS et cassait raw_pageviews, cluster#618) ET ~50× plus rapide (remplace le
# ThreadPool 16 de L96, dont le burst était justement le problème). Séquentiel entre lots.
_RESOLVE_BATCH_SIZE = 50
# Taille de lot des ROR par requête SPARQL. À l'échelle prod (filtre pays vide,
# ``max_institutions=0``), le catalogue rend des DIZAINES DE MILLIERS de ROR : les
# empiler tous dans un seul ``VALUES`` produit une requête que l'endpoint public REFUSE
# (URL de ~400 Ko en GET → Broken pipe ; et même en POST, un ``VALUES`` géant dépasse la
# limite de temps de 60 s de Wikidata). On DÉCOUPE donc les ROR en lots bornés, une
# requête POST par lot, résultats fusionnés. 200 tient largement sous la limite de temps.
_SPARQL_BATCH_SIZE = 200
# `ref_universities` est la source INGÉRÉE du référentiel (par opposition à un référentiel
# pré-seedé) → il écrit dans la partition `source=ingested` du CONTRAT DE CHEMIN PARTAGÉ
# (`lakehouse.referential_*`), même source unique que celle LUE par l'aval `raw_pageviews`.
# La prod pose `PAGEVIEWS_REF_SOURCE=ingested` (deploy/overlays/prod). Instantané courant
# unique (pas de partition temporelle) : le référentiel évolue lentement, rematérialisable.
_REF_SOURCE = "ingested"

# Bandes de volume de publications (``works_count``) : discrétise une variable très
# étalée en catégories stables, exploitables comme feature/segment en aval sans fuiter
# le compte brut. Bornes documentées, ordre croissant.
_WORKS_BANDS = ((1_000, "xs"), (5_000, "s"), (20_000, "m"), (100_000, "l"))
_WORKS_BAND_XL = "xl"


class RefUniversitiesConfig(Config):
    """Paramètres de construction du référentiel (bornables pour un banc léger)."""

    country_codes: list[str] = Field(default_factory=list)
    """Codes pays ISO-2 filtrant le catalogue (``["FR", "DE"]``…). Vide = **aucun
    filtre pays** (tout ``type:education``). Le banc pose une petite liste pour rester
    léger ; la prod laisse vide (référentiel complet)."""

    max_institutions: int = 0
    """Nombre maximal d'établissements à retenir. ``0`` = **illimité** (défaut prod).
    Le banc pose une petite valeur (pagination arrêtée tôt) pour ne pas se congestionner."""

    langs: list[str] = Field(default_factory=lambda: ["en"])
    """Langues de projet encyclopédique dont on retient les titres (codes de site :
    ``en``, ``fr``, ``de``…). Une ligne du référentiel par ``(university_id, lang)``."""


# ─────────────────────────────────────────────────────────────────────────────
#  Modèle de sortie
# ─────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class RefRow:
    """Une ligne du référentiel : un établissement × une langue d'article.

    Grain ``(university_id, lang)``. ``ror``/``qid`` identifient l'établissement des
    deux côtés de la jointure ; ``title`` est le titre d'article RÉSOLU (post-redirection)
    dont l'aval comptera les vues ; ``has_wp`` dit si un tel titre existe pour la langue.
    """

    ror: str
    qid: str
    university_id: str
    lang: str
    title: str
    country_code: str
    works_band: str
    has_wp: bool


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS (aucune I/O — testables sans réseau ni S3)
# ─────────────────────────────────────────────────────────────────────────────


def works_band(works_count: int) -> str:
    """Discrétise un ``works_count`` en bande (``xs``…``xl``) selon des bornes fixes.

    Bandes croissantes : la première borne dont ``works_count`` est INFÉRIEUR gagne ;
    au-delà de la dernière borne, ``xl``. Un compte négatif (source aberrante) tombe
    dans la plus petite bande — on ne lève pas sur une donnée sale.
    """
    for upper, label in _WORKS_BANDS:
        if works_count < upper:
            return label
    return _WORKS_BAND_XL


def _ror_id(raw: str) -> str:
    """Normalise un ROR en identifiant NU (sans schéma ni hôte).

    Le catalogue expose ``https://ror.org/0abc123`` ; la base de connaissances porte
    la même valeur mais parfois sans schéma. On réduit aux derniers segments non vides
    pour que la jointure des deux côtés se fasse sur la même clé (``0abc123``).
    """
    cleaned = (raw or "").strip().rstrip("/")
    if not cleaned:
        return ""
    return cleaned.rsplit("/", 1)[-1]


def parse_institutions(payload: dict) -> list[dict]:
    """Projette une page du catalogue d'organisations en établissements normalisés.

    Retient les entrées portant un ROR (clé de jointure). Chaque établissement rendu :
    ``{ror, university_id, country_code, works_band}``. Une entrée sans ROR est ignorée
    (silencieuse) : elle ne pourrait pas être jointe à la base de connaissances.
    """
    out: list[dict] = []
    for rec in payload.get("results") or []:
        ror = _ror_id(rec.get("ror") or (rec.get("ids") or {}).get("ror") or "")
        if not ror:
            continue
        university_id = (rec.get("id") or "").strip()
        if not university_id:
            continue
        geo = rec.get("geo") or {}
        country = (geo.get("country_code") or rec.get("country_code") or "").strip().upper()
        count = int(rec.get("works_count") or 0)
        out.append(
            {
                "ror": ror,
                "university_id": university_id,
                "country_code": country,
                "works_band": works_band(count),
            }
        )
    return out


def _binding_str(binding: dict, key: str) -> str:
    """Extrait la ``value`` d'un binding SPARQL (``{key: {"value": …}}``) ; ``""`` si absent."""
    return ((binding.get(key) or {}).get("value") or "").strip()


def _qid(entity_uri: str) -> str:
    """Réduit une URI d'entité (``http://…/entity/Q42``) à son ``qid`` (``Q42``)."""
    cleaned = (entity_uri or "").strip().rstrip("/")
    return cleaned.rsplit("/", 1)[-1] if cleaned else ""


def parse_wikidata_titles(payload: dict, langs: list[str]) -> dict[str, dict]:
    """Indexe la réponse SPARQL par ROR → ``{qid, titles: {lang: title}}``.

    La requête rend, par binding : le ROR (``?ror``), l'entité (``?item`` → qid) et un
    couple (``?lang``, ``?title``) pour chaque article de projet encyclopédique. On
    n'agrège QUE les langues demandées (``langs``). Plusieurs bindings partagent le
    même ROR (un par langue) : on les fusionne. La clé est le ROR NORMALISÉ pour
    coïncider avec ``parse_institutions``.
    """
    wanted = set(langs)
    index: dict[str, dict] = {}
    for binding in (payload.get("results") or {}).get("bindings") or []:
        ror = _ror_id(_binding_str(binding, "ror"))
        if not ror:
            continue
        entry = index.setdefault(ror, {"qid": _qid(_binding_str(binding, "item")), "titles": {}})
        lang = _binding_str(binding, "lang")
        title = _binding_str(binding, "title")
        if lang in wanted and title:
            # Premier titre gagné par langue (la requête est triée) : stable et déterministe.
            entry["titles"].setdefault(lang, title)
    return index


def join_rows(
    institutions: list[dict],
    knowledge_base: dict[str, dict],
    resolved_titles: dict[tuple[str, str], str],
    langs: list[str],
) -> list[RefRow]:
    """Jointure PURE établissements × base de connaissances → lignes du référentiel.

    Pour chaque établissement (par ROR) et chaque langue demandée, produit UNE ligne :

    - joint sur le ROR normalisé ; un établissement absent de la base de connaissances
      garde un ``qid``/``title`` vide et ``has_wp=False`` (on le conserve : le pays et la
      bande de volume restent exploitables en aval) ;
    - le ``title`` écrit est la valeur RÉSOLUE (post-redirection) fournie par
      ``resolved_titles[(qid, brut)]`` — jamais l'ancien titre obsolète (piège renommage) ;
    - ``has_wp`` reflète l'existence d'un titre résolu non vide pour la langue.

    Déterminisme (ADR 0057) : établissements triés par ``university_id``, langues dans
    l'ordre demandé.
    """
    rows: list[RefRow] = []
    for inst in sorted(institutions, key=lambda i: i["university_id"]):
        wd = knowledge_base.get(inst["ror"], {"qid": "", "titles": {}})
        qid = wd["qid"]
        for lang in langs:
            raw_title = wd["titles"].get(lang, "")
            title = resolved_titles.get((qid, raw_title), raw_title) if raw_title else ""
            rows.append(
                RefRow(
                    ror=inst["ror"],
                    qid=qid,
                    university_id=inst["university_id"],
                    lang=lang,
                    title=title,
                    country_code=inst["country_code"],
                    works_band=inst["works_band"],
                    has_wp=bool(title),
                )
            )
    return rows


def _sparql_query(rors: list[str], langs: list[str]) -> str:
    """Construit la requête SPARQL : ROR (P6782) → item + titres d'article par langue.

    Filtre sur les ROR retenus (``VALUES``) et les langues demandées, pour que la base
    de connaissances ne remonte que ce dont on a besoin (requête bornée, pas un dump).
    """
    values = " ".join(f'"{r}"' for r in rors)
    lang_filter = " ".join(f'"{lang}"' for lang in langs)
    return (
        "SELECT ?ror ?item ?lang ?title WHERE {\n"
        f"  VALUES ?ror {{ {values} }}\n"
        "  ?item wdt:P6782 ?ror .\n"
        "  ?article schema:about ?item ; schema:inLanguage ?lang ; schema:name ?title .\n"
        f"  VALUES ?lang {{ {lang_filter} }}\n"
        '  FILTER(CONTAINS(STR(?article), ".wikipedia.org/"))\n'
        "} ORDER BY ?ror ?lang"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Glue I/O (HTTP + résolution redirections + écriture S3) — injectable
# ─────────────────────────────────────────────────────────────────────────────


# Codes HTTP TRANSITOIRES : une nouvelle tentative a des chances d'aboutir. 429 (rate-limit
# — sans objet pour les institutions désormais lues du S3, mais possible côté Wikimedia) et
# 5xx (l'endpoint SPARQL public Wikidata renvoie des 502/503 intermittents sous charge).
_RETRYABLE_HTTP = frozenset({429, 500, 502, 503, 504})
_HTTP_MAX_ATTEMPTS = 5  # 1 essai + 4 reprises
_HTTP_BACKOFF_BASE_S = 1.0  # backoff exponentiel : 1, 2, 4, 8 s (borné par Retry-After si fourni)
_HTTP_BACKOFF_CAP_S = 30.0  # plafond d'une attente (un Retry-After aberrant ne gèle pas le run)


def _retry_delay_s(attempt: int, retry_after: str | None) -> float:
    """Délai (s) avant la reprise ``attempt`` (0-indexée) — PUR, testable.

    Honore l'en-tête ``Retry-After`` (secondes entières) s'il est présent et valide ; sinon
    backoff EXPONENTIEL ``base × 2**attempt``. Plafonné à ``_HTTP_BACKOFF_CAP_S`` (un
    ``Retry-After`` aberrant ne fige pas le run). Pas de jitter : le déterminisme prime
    (ADR 0057) et les reprises sont peu nombreuses (≤4), le troupeau n'est pas un enjeu.
    """
    if retry_after:
        try:
            return min(float(int(retry_after)), _HTTP_BACKOFF_CAP_S)
        except (TypeError, ValueError):
            pass  # Retry-After au format date HTTP (rare) → on retombe sur le backoff
    return min(_HTTP_BACKOFF_BASE_S * (2**attempt), _HTTP_BACKOFF_CAP_S)


class _Fetcher:
    """Client HTTP minimal (stdlib) pour les sources ouvertes restantes (SPARQL / REST).

    Isolé pour rester INJECTABLE (les corps de parsing sont purs, celui-ci est
    monkeypatchable en test — aucun réseau réel requis). Un User-Agent explicite est
    posé : les endpoints publics rejettent les requêtes anonymes. Les erreurs HTTP
    TRANSITOIRES (429/5xx) et les erreurs de connexion sont RÉESSAYÉES avec backoff
    exponentiel (le SPARQL public Wikidata renvoie des 502 intermittents sous charge —
    sans reprise, un seul 502 tuait le run, drift D27 §2).
    """

    _UA = "pageviews-dagster/0.0 (dataops; +https://github.com/univ-lehavre/atlas)"

    def __init__(self, timeout: float = _HTTP_TIMEOUT, sleep=time.sleep) -> None:
        self._timeout = timeout
        self._sleep = sleep  # injectable → tests déterministes sans attente réelle

    def _read(self, req: urllib.request.Request, label: str) -> dict:
        """Ouvre ``req`` avec REPRISE sur erreur transitoire ; lève ``Failure`` à l'épuisement.

        Réessaie sur HTTPError 429/5xx (honore ``Retry-After`` si présent) et sur URLError
        (connexion/DNS/timeout). Une HTTPError 4xx non-transitoire (400/404…) échoue tout de
        suite — la reprise ne changerait rien. Backoff exponentiel borné à ``_HTTP_MAX_ATTEMPTS``.
        """
        last: Exception | None = None
        for attempt in range(_HTTP_MAX_ATTEMPTS):
            try:
                with urllib.request.urlopen(req, timeout=self._timeout) as resp:  # noqa: S310
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                last = exc
                if exc.code not in _RETRYABLE_HTTP or attempt == _HTTP_MAX_ATTEMPTS - 1:
                    break
                self._sleep(_retry_delay_s(attempt, exc.headers.get("Retry-After")))
            except (urllib.error.URLError, OSError) as exc:
                last = exc  # connexion/DNS/timeout : transitoire, on réessaie
                if attempt == _HTTP_MAX_ATTEMPTS - 1:
                    break
                self._sleep(_retry_delay_s(attempt, None))
            except json.JSONDecodeError as exc:
                last = exc  # réponse illisible : pas une erreur réseau, inutile de réessayer
                break
        raise Failure(
            description=f"Requête source échouée après {_HTTP_MAX_ATTEMPTS} tentatives : {label}",
            metadata={"error": MetadataValue.text(str(last))},
        ) from last

    def get_json(self, url: str, params: dict | None = None) -> dict:
        """GET JSON avec paramètres de requête ; ``Failure`` après reprises épuisées."""
        if params:
            url = f"{url}?{urllib.parse.urlencode(params)}"
        headers = {"User-Agent": self._UA, "Accept": "application/json"}
        req = urllib.request.Request(url, headers=headers)  # noqa: S310 — hôtes https connus
        return self._read(req, url)

    def post_json(self, url: str, data: dict) -> dict:
        """POST ``data`` (form-urlencodé) et rend le JSON ; ``Failure`` après reprises épuisées.

        Le corps de requête porte les paramètres au lieu de l'URL : un GET SPARQL avec des
        milliers de ROR en ``VALUES`` produit une URL de ~400 Ko que l'endpoint public
        RESET (Broken pipe). Le POST supprime la limite de longueur d'URL (la clé du fix
        de mise à l'échelle prod de ``_fetch_wikidata``).
        """
        body = urllib.parse.urlencode(data).encode("utf-8")
        headers = {
            "User-Agent": self._UA,
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        req = urllib.request.Request(url, data=body, headers=headers)  # noqa: S310 — hôtes https connus
        return self._read(req, url)


def institutions_query(local_glob: str, config: RefUniversitiesConfig) -> str:
    """SQL DuckDB (PUR, testable) lisant le snapshot ``institutions`` LOCAL → établissements.

    ``local_glob`` = le chemin des Parquet rapatriés (``<dir>/**/*.parquet``). Filtre
    ``type='education'`` (+ pays si demandé), **dédup par ``id`` en gardant la partition
    ``updated_date`` la plus récente** (catalogue courant), projette les colonnes de
    ``parse_institutions`` (``ror``, ``id``, ``country_code``, ``works_count``). Le ROR est
    normalisé en aval par ``parse_institutions`` ; le tri par ``id`` rend l'ordre DÉTERMINISTE
    (ADR 0057). ``max_institutions`` borne le résultat (0 = illimité).
    """
    where = ["type = 'education'", "ror IS NOT NULL", "ror <> ''"]
    if config.country_codes:
        codes = ", ".join(
            "'" + c.strip().upper().replace("'", "") + "'" for c in config.country_codes
        )
        where.append(f"upper(coalesce(country_code, geo.country_code)) IN ({codes})")
    limit = f"\nLIMIT {int(config.max_institutions)}" if config.max_institutions else ""
    return (
        "WITH ranked AS (\n"
        "  SELECT id, ror, ids, country_code, geo, works_count, updated_date,\n"
        "         row_number() OVER (PARTITION BY id ORDER BY updated_date DESC) AS rn\n"
        f"  FROM read_parquet('{local_glob}', hive_partitioning=true)\n"
        f"  WHERE {' AND '.join(where)}\n"
        ")\n"
        "SELECT id, ror, ids,\n"
        "       coalesce(country_code, geo.country_code) AS country_code, works_count\n"
        "FROM ranked WHERE rn = 1\n"
        f"ORDER BY id{limit}"
    )


def _rclone_copy_institutions(dest_dir: Path) -> None:
    """Rapatrie le snapshot ``institutions`` (Parquet) du remote ``openalex`` → ``dest_dir``.

    Rend le ``rclone.conf`` (remote ``openalex`` anonyme + ``ceph`` interne) dans un fichier
    temporaire, puis ``rclone copy`` parallélisé (16 transferts) ne prenant que les
    ``*.parquet``. Lève ``Failure`` si la copie échoue (fail-fast, ADR 0046). ~5 s en prod.
    """
    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(ceph_target_from_env()))
        proc = subprocess.run(
            ["rclone", "--config", str(config_path), "copy", "--transfers", "16",
             "--include", "*.parquet", _OPENALEX_INSTITUTIONS_SRC, str(dest_dir)],
            capture_output=True, text=True, check=False,
        )  # fmt: skip
        if proc.returncode != 0:
            raise Failure(
                description="Rapatriement du snapshot OpenAlex ``institutions`` échoué (rclone).",
                metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
            )


def _fetch_institutions(config: RefUniversitiesConfig) -> list[dict]:
    """Lit le catalogue (``type:education`` + filtre pays) depuis le SNAPSHOT S3 → normalisé.

    Rapatrie le snapshot ``institutions`` en local (rclone, remote anonyme ``openalex``) puis
    l'interroge en DuckDB local (``institutions_query``, pure) — dédup par ``id`` sur la
    partition la plus récente. Chaque ligne est re-normalisée par ``parse_institutions``
    (mêmes règles ROR/pays/bande que l'ancienne page d'API → aucun changement de sémantique
    aval). Remplace la pagination par curseur de l'API REST (rate-limitée, 429 en prod).
    """
    with tempfile.TemporaryDirectory() as snap_dir:
        _rclone_copy_institutions(Path(snap_dir))
        con = duckdb.connect()  # lecture LOCALE : aucun secret S3 requis
        rows = con.execute(institutions_query(f"{snap_dir}/**/*.parquet", config)).fetchall()
    # DuckDB rend (id, ror, ids{struct}, country_code, works_count) : on les remet en forme
    # "enregistrement" que parse_institutions projette (mêmes clés que l'API :
    # `id`, `ror`, `ids.ror`, `country_code`, `works_count`).
    payload = {
        "results": [
            {
                "id": r[0],
                "ror": r[1],
                "ids": {"ror": (r[2] or {}).get("ror") if isinstance(r[2], dict) else None},
                "country_code": r[3],
                "works_count": r[4],
            }
            for r in rows
        ]
    }
    return parse_institutions(payload)


def _chunked(items: list[str], size: int) -> list[list[str]]:
    """Découpe ``items`` en lots de ``size`` maximum (dernier lot possiblement plus court).

    ``size`` non positif → un seul lot (pas de découpage) : garde-fou contre une config
    aberrante qui produirait une infinité de lots vides.
    """
    if size <= 0:
        return [items] if items else []
    return [items[i : i + size] for i in range(0, len(items), size)]


def merge_knowledge_bases(bases: list[dict[str, dict]]) -> dict[str, dict]:
    """Fusionne les index SPARQL de plusieurs lots en un seul (PUR, testable sans réseau).

    Les lots portent des ROR DISJOINTS (partition de la sélection), donc la fusion est un
    simple assemblage. Robuste néanmoins à un ROR vu deux fois : le premier lot gagne, et
    les titres par langue sont fusionnés sans écrasement (``setdefault``) → même sémantique
    « premier titre gagné » que ``parse_wikidata_titles`` (déterminisme ADR 0057).
    """
    merged: dict[str, dict] = {}
    for base in bases:
        for ror, entry in base.items():
            target = merged.setdefault(ror, {"qid": entry["qid"], "titles": {}})
            for lang, title in entry["titles"].items():
                target["titles"].setdefault(lang, title)
    return merged


def _fetch_wikidata(fetcher: _Fetcher, rors: list[str], langs: list[str]) -> dict[str, dict]:
    """Interroge la base de connaissances (SPARQL) pour les ROR retenus → index par ROR.

    Requête bornée aux ROR de la sélection (``VALUES``), DÉCOUPÉE en lots (``_SPARQL_BATCH_SIZE``)
    car la sélection prod compte des dizaines de milliers de ROR — un seul ``VALUES`` fait
    exploser l'URL/la durée côté endpoint (cf. ``_SPARQL_BATCH_SIZE``). Un POST par lot (corps
    de requête, pas d'URL géante), résultats fusionnés par ``merge_knowledge_bases``. Corps de
    parsing délégué à ``parse_wikidata_titles`` (pur). Renvoie ``{}`` si aucun ROR.
    """
    if not rors:
        return {}
    bases: list[dict[str, dict]] = []
    for batch in _chunked(rors, _SPARQL_BATCH_SIZE):
        payload = fetcher.post_json(
            _WIKIDATA_SPARQL_URL,
            {"query": _sparql_query(batch, langs), "format": "json"},
        )
        bases.append(parse_wikidata_titles(payload, langs))
    return merge_knowledge_bases(bases)


def resolve_batch(payload: dict, requested: list[str]) -> dict[str, str]:
    """Mappe ``titre_demandé → titre_résolu`` depuis UNE réponse ``action=query`` (PUR).

    L'API chaîne DEUX transformations : ``query.normalized[]`` (casse / ``_``→espace) PUIS
    ``query.redirects[]`` (renommage). Pour chaque titre demandé, on suit la chaîne
    ``demandé → normalisé → redirigé`` et on renvoie le dernier maillon. Best-effort : un
    titre absent des deux tables (donc ni normalisé ni redirigé) reste INCHANGÉ (pas de
    perte de ligne). Testable sans réseau. Ordre-indépendant → déterministe (ADR 0057).
    """
    q = payload.get("query") or {}
    norm = {m.get("from"): m.get("to") for m in (q.get("normalized") or []) if m.get("from")}
    redir = {m.get("from"): m.get("to") for m in (q.get("redirects") or []) if m.get("from")}
    out: dict[str, str] = {}
    for title in requested:
        step = norm.get(title, title)  # 1) normalisation éventuelle
        step = redir.get(step, step)  # 2) redirection éventuelle (sur le titre normalisé)
        out[title] = step or title
    return out


def _resolve_titles(
    fetcher: _Fetcher, knowledge_base: dict[str, dict], langs: list[str], log=None
) -> dict[tuple[str, str], str]:
    """Résout chaque titre brut vers sa cible de redirection (piège renommage).

    Pour chaque ``(qid, lang, titre_brut)`` connu de la base de connaissances, résout le
    titre via l'API Action (``action=query&redirects=1``) : si le titre est une redirection
    (article renommé), on récupère le **titre canonique** courant ; sinon on garde le titre
    brut. Renvoie ``{(qid, titre_brut): titre_résolu}`` — clé stable consommée par ``join_rows``.

    BATCHÉ par 50 (drift D27 §3) : l'API Action accepte 50 titres par requête → on résout
    par lots (une requête ``action=query`` par lot de titres UNIQUES d'une même langue),
    remplaçant le ThreadPool 16 de L96. ~50× moins d'appels/résolutions DNS (plus de BURST
    qui écroulait CoreDNS et cassait raw_pageviews, cluster#618) ET ~50× plus rapide. Le
    résultat est ORDRE-indépendant (dict clé ``(qid, titre)``) → déterministe (ADR 0057).
    ``log`` (callable optionnel) reçoit une ligne de progression ≥ 1×/min.

    Résolution best-effort : un échec de lot (endpoint injoignable) laisse les titres du lot
    INCHANGÉS (pas de perte de ligne, ``has_wp`` reste True sur le titre brut). C'est le SEUL
    point réseau tolérant : le référentiel se construit même si des titres ne se résolvent pas.
    """
    # Titres UNIQUES par langue (le même titre sous plusieurs qids → une seule résolution).
    by_lang: dict[str, set[str]] = {}
    for entry in knowledge_base.values():
        for lang, raw_title in entry["titles"].items():
            if lang in langs and raw_title:
                by_lang.setdefault(lang, set()).add(raw_title)

    total = sum(len(t) for t in by_lang.values())
    if log:
        log(
            f"ref_universities : résolution BATCHÉE de {total} titres "
            f"(redirections, lots de {_RESOLVE_BATCH_SIZE})…"
        )
    # Résolution titre→résolu par langue, batchée.
    resolved_by_lang: dict[str, dict[str, str]] = {lang: {} for lang in by_lang}
    done = 0
    start_t = last_log_t = time.monotonic()
    for lang, titles in by_lang.items():
        url = _WIKIPEDIA_ACTION_API.format(lang=lang)
        for lot in _chunked(sorted(titles), _RESOLVE_BATCH_SIZE):  # sorted → lots déterministes
            try:
                payload = fetcher.get_json(
                    url,
                    {
                        "action": "query",
                        "format": "json",
                        "redirects": "1",
                        "titles": "|".join(lot),
                    },
                )
                resolved_by_lang[lang].update(resolve_batch(payload, lot))
            except Failure:
                resolved_by_lang[lang].update({t: t for t in lot})  # best-effort : titres bruts
            done += len(lot)
            now = time.monotonic()
            if log and (now - last_log_t >= 60.0):
                elapsed = now - start_t
                eta = (elapsed / done) * (total - done) if done else 0.0
                log(
                    f"ref_universities : {done}/{total} titres résolus · "
                    f"{done / elapsed:.0f} titres/s · ETA ~{eta / 60:.0f} min"
                )
                last_log_t = now
    if log:
        mins = (time.monotonic() - start_t) / 60
        log(f"ref_universities : {total} titres résolus en {mins:.1f} min.")

    # Fan-out : chaque (qid, titre_brut) reçoit la résolution de son (lang, titre_brut).
    resolved: dict[tuple[str, str], str] = {}
    for entry in knowledge_base.values():
        for lang, raw_title in entry["titles"].items():
            if lang in langs and raw_title:
                resolved[(entry["qid"], raw_title)] = resolved_by_lang[lang].get(
                    raw_title, raw_title
                )
    return resolved


def _write_referential(rows: list[RefRow], bucket: str) -> None:
    """Écrit le référentiel en Parquet sous ``raw/ref_universities`` du lakehouse.

    Construit une relation DuckDB à partir des lignes (aucun fichier temporaire local :
    ``VALUES`` inséré dans une table éphémère), puis ``COPY … (FORMAT PARQUET)`` vers S3
    via ``lakehouse.copy_to_parquet``. Écriture déterministe (lignes déjà triées par
    ``join_rows``). Instantané courant unique (pas de partition ``dt=``) : le référentiel
    évolue lentement, on écrase la version précédente à la rematérialisation.
    """
    con = lakehouse.connect()
    con.execute(
        "CREATE OR REPLACE TABLE _ref_universities ("
        "ror VARCHAR, qid VARCHAR, university_id VARCHAR, lang VARCHAR, "
        "title VARCHAR, country_code VARCHAR, works_band VARCHAR, has_wp BOOLEAN)"
    )
    con.executemany(
        "INSERT INTO _ref_universities VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (r.ror, r.qid, r.university_id, r.lang, r.title, r.country_code, r.works_band, r.has_wp)
            for r in rows
        ],
    )
    dest = lakehouse.referential_dest(bucket, _REF_SOURCE)
    lakehouse.copy_to_parquet(con, "SELECT * FROM _ref_universities", dest)


def _summary(rows: list[RefRow]) -> dict[str, int]:
    """Compteurs du référentiel pour les métadonnées de matérialisation.

    - ``n_etablissements`` : établissements DISTINCTS (par ``university_id``) ;
    - ``n_titres`` : lignes portant un titre d'article résolu (``has_wp``) ;
    - ``n_langues`` : langues distinctes réellement couvertes par un titre.
    """
    return {
        "n_etablissements": len({r.university_id for r in rows}),
        "n_titres": sum(1 for r in rows if r.has_wp),
        "n_langues": len({r.lang for r in rows if r.has_wp}),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Asset (orchestration)
# ─────────────────────────────────────────────────────────────────────────────


@asset(name="ref_universities", group_name="ingestion")
def ref_universities(context, config: RefUniversitiesConfig) -> MaterializeResult:
    """Construit le référentiel établissements × titres d'article → ``raw/ref_universities``.

    Chaîne : catalogue d'organisations (``type:education`` → ROR) ▸ base de connaissances
    (SPARQL, ROR P6782 → qid + titres multilingues) ▸ résolution des redirections (piège
    renommage) ▸ jointure PURE ▸ écriture Parquet. Aucune partition temporelle : instantané
    courant unique, rematérialisable quand les sources bougent.
    """
    bucket = lakehouse.duckdb_s3_config_from_env().bucket
    run_id = context.run_id
    fetcher = _Fetcher()

    lineage.emit(RunState.START, run_id, "ref_universities", [lineage.source_dataset()], [])

    log = context.log.info
    institutions = _fetch_institutions(config)
    rors = sorted({inst["ror"] for inst in institutions})
    log(f"ref_universities : {len(institutions)} établissements, {len(rors)} ROR distincts.")
    knowledge_base = _fetch_wikidata(fetcher, rors, config.langs)
    log(f"ref_universities : {len(knowledge_base)} ROR appariés dans la base de connaissances.")
    _resolve_t0 = time.monotonic()
    resolved = _resolve_titles(fetcher, knowledge_base, config.langs, log=log)
    resolve_duration_s = round(time.monotonic() - _resolve_t0, 1)
    rows = join_rows(institutions, knowledge_base, resolved, config.langs)

    if not rows:
        raise Failure(
            description="Référentiel vide : aucun établissement retenu (filtre pays trop "
            "restrictif ou sources indisponibles)."
        )

    _write_referential(rows, bucket)

    lineage.emit(
        RunState.COMPLETE,
        run_id,
        "ref_universities",
        [lineage.source_dataset()],
        [lineage.raw_dataset("ref_universities")],
    )

    summary = _summary(rows)
    return MaterializeResult(
        metadata={
            "n_etablissements": MetadataValue.int(summary["n_etablissements"]),
            "n_titres": MetadataValue.int(summary["n_titres"]),
            "n_langues": MetadataValue.int(summary["n_langues"]),
            "langs": MetadataValue.text(", ".join(config.langs)),
            "bucket": MetadataValue.text(f"{bucket}/{lakehouse.referential_prefix(_REF_SOURCE)}"),
            # Historique run-à-run (métadonnées Dagster, drift L96) : nb de titres résolus et
            # durée de la résolution parallélisée — repérer une régression de débit.
            "n_titres_resolus": MetadataValue.int(len(resolved)),
            "resolution_duration_s": MetadataValue.float(resolve_duration_s),
        }
    )

"""Asset d'ingestion du RÉFÉRENTIEL d'établissements (grain amont du pipeline).

Construit la table pivot qui relie un **établissement** à ses **titres d'article
encyclopédique** (par langue), pour que l'aval sache QUELLES pages compter. Deux
sources ouvertes sont jointes par un identifiant d'organisation partagé (ROR) :

- un **catalogue d'organisations de recherche** (API, ``type:education``) qui donne,
  pour chaque établissement, son ROR, son pays et une bande de volume de publications ;
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

**Échelle.** À l'échelle réelle, ces jointures se feraient sur des **dumps** (extrait
Wikidata, snapshot du catalogue) plutôt que par appels API unitaires. Ici l'asset
DOCUMENTE le pattern API + dump : la glue I/O (HTTP, résolution de redirections,
écriture S3) est isolée derrière un ``_Fetcher`` injectable, et les corps de parsing
sont **purs** (aucune I/O), donc testables sans réseau ni S3.

NB : pas de ``from __future__ import annotations`` — Dagster introspecte les
annotations des assets à l'exécution (drift D9 ; le cœur pur ``forecast_model`` peut,
lui, la porter — pas les assets).
"""

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass

from dagster import Config, Failure, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState
from pydantic import Field

from pageviews_dagster import lakehouse, lineage

# ── Sources externes (en PROSE uniquement ; jamais dans un identifiant interne) ──
# Catalogue d'organisations de recherche : filtre ``type:education`` → ROR, pays,
# nombre d'œuvres. Paginé par curseur (l'API borne à ~200 par page).
_OPENALEX_INSTITUTIONS_URL = "https://api.openalex.org/institutions"
# Point d'accès SPARQL de la base de connaissances collaborative. La requête part du
# ROR (propriété P6782) et remonte le qid + les libellés d'article par site linguistique.
_WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
# API REST des projets encyclopédiques : sert à RÉSOUDRE un titre vers sa cible de
# redirection (``redirects=1``) — piège des renommages.
_WIKIPEDIA_REST_HOST = "wikipedia.org"

_HTTP_TIMEOUT = 120.0
# Chemin du référentiel dans le lakehouse (Parquet). Instantané courant unique : le
# référentiel évolue LENTEMENT (pas de partition temporelle), rematérialisable au besoin.
_REF_DEST_SUBDIR = "raw/ref_universities"

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


def next_cursor(payload: dict) -> str | None:
    """Curseur de pagination de la page (``meta.next_cursor``) ; ``None`` en fin de liste.

    L'API renvoie ``next_cursor: null`` (ou ``"*"`` figé) quand il n'y a plus de page :
    on rend ``None`` dans les deux cas pour ARRÊTER la boucle (sinon pagination infinie).
    """
    cursor = (payload.get("meta") or {}).get("next_cursor")
    if not cursor or cursor == "*":
        return None
    return str(cursor)


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


class _Fetcher:
    """Client HTTP minimal (stdlib) pour les trois sources ouvertes.

    Isolé pour rester INJECTABLE (les corps de parsing sont purs, celui-ci est
    monkeypatchable en test — aucun réseau réel requis). Un User-Agent explicite est
    posé : les endpoints publics (SPARQL, API) rejettent les requêtes anonymes.
    """

    _UA = "pageviews-dagster/0.0 (dataops; +https://github.com/univ-lehavre/atlas)"

    def __init__(self, timeout: float = _HTTP_TIMEOUT) -> None:
        self._timeout = timeout

    def get_json(self, url: str, params: dict | None = None) -> dict:
        """GET JSON avec paramètres de requête ; lève ``Failure`` sur erreur réseau/HTTP."""
        if params:
            url = f"{url}?{urllib.parse.urlencode(params)}"
        headers = {"User-Agent": self._UA, "Accept": "application/json"}
        req = urllib.request.Request(url, headers=headers)  # noqa: S310 — hôtes https connus
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:  # noqa: S310
                return json.loads(resp.read().decode("utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise Failure(
                description=f"Requête source échouée : {url}",
                metadata={"error": MetadataValue.text(str(exc))},
            ) from exc


def _fetch_institutions(fetcher: _Fetcher, config: RefUniversitiesConfig) -> list[dict]:
    """Pagine le catalogue (``type:education`` + filtre pays) → établissements normalisés.

    Pagination par CURSEUR (``cursor=*`` puis ``meta.next_cursor``), bornée par
    ``max_institutions`` (0 = illimité). S'arrête quand la source ne rend plus de curseur
    ou quand le quota est atteint. Corps de parsing délégué à ``parse_institutions`` (pur).
    """
    filters = ["type:education"]
    if config.country_codes:
        filters.append("country_code:" + "|".join(c.lower() for c in config.country_codes))
    institutions: list[dict] = []
    cursor: str | None = "*"
    while cursor is not None:
        payload = fetcher.get_json(
            _OPENALEX_INSTITUTIONS_URL,
            {"filter": ",".join(filters), "per-page": 200, "cursor": cursor},
        )
        institutions.extend(parse_institutions(payload))
        if config.max_institutions and len(institutions) >= config.max_institutions:
            institutions = institutions[: config.max_institutions]
            break
        cursor = next_cursor(payload)
    return institutions


def _fetch_wikidata(fetcher: _Fetcher, rors: list[str], langs: list[str]) -> dict[str, dict]:
    """Interroge la base de connaissances (SPARQL) pour les ROR retenus → index par ROR.

    Requête bornée aux ROR de la sélection (``VALUES``). Corps de parsing délégué à
    ``parse_wikidata_titles`` (pur). Renvoie ``{}`` si aucun ROR (rien à joindre).
    """
    if not rors:
        return {}
    payload = fetcher.get_json(
        _WIKIDATA_SPARQL_URL,
        {"query": _sparql_query(rors, langs), "format": "json"},
    )
    return parse_wikidata_titles(payload, langs)


def _resolve_titles(
    fetcher: _Fetcher, knowledge_base: dict[str, dict], langs: list[str]
) -> dict[tuple[str, str], str]:
    """Résout chaque titre brut vers sa cible de redirection (piège renommage).

    Pour chaque ``(qid, lang, titre_brut)`` connu de la base de connaissances, interroge
    l'API REST du projet linguistique avec ``redirects=1`` : si le titre est une
    redirection (article renommé), on récupère le **titre canonique** courant ; sinon on
    garde le titre brut. Renvoie ``{(qid, titre_brut): titre_résolu}`` — clé stable
    consommée par ``join_rows``.

    Résolution best-effort : un échec ponctuel de l'API (titre supprimé, endpoint
    injoignable) laisse le titre brut inchangé (pas de perte de ligne, ``has_wp`` reste
    True sur le titre brut). C'est le SEUL point réseau tolérant : le référentiel doit se
    construire même si une poignée de titres ne se résout pas.
    """
    resolved: dict[tuple[str, str], str] = {}
    for entry in knowledge_base.values():
        qid = entry["qid"]
        for lang, raw_title in entry["titles"].items():
            if lang not in langs or not raw_title:
                continue
            resolved[(qid, raw_title)] = _resolve_one_title(fetcher, lang, raw_title)
    return resolved


def _resolve_one_title(fetcher: _Fetcher, lang: str, raw_title: str) -> str:
    """Résout UN titre via l'API REST (``redirects=1``) ; retombe sur le brut en cas d'échec."""
    encoded = urllib.parse.quote(raw_title.replace(" ", "_"), safe="")
    url = f"https://{lang}.{_WIKIPEDIA_REST_HOST}/w/rest.php/v1/page/{encoded}"
    try:
        payload = fetcher.get_json(url, {"redirect": "true"})
    except Failure:
        return raw_title  # best-effort : renommage non résolu → on garde le titre connu
    canonical = (payload.get("title") or "").strip()
    return canonical or raw_title


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
    dest = f"s3://{bucket}/{_REF_DEST_SUBDIR}/ref_universities.parquet"
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

    institutions = _fetch_institutions(fetcher, config)
    rors = sorted({inst["ror"] for inst in institutions})
    knowledge_base = _fetch_wikidata(fetcher, rors, config.langs)
    resolved = _resolve_titles(fetcher, knowledge_base, config.langs)
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
            "bucket": MetadataValue.text(f"{bucket}/{_REF_DEST_SUBDIR}"),
        }
    )

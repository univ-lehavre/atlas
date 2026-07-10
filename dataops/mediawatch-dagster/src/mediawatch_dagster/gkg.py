"""Parsing pur du flux GKG 2.1 de GDELT (sans I/O — testable hermétiquement).

Centralise toute la connaissance SPÉCIFIQUE au format GDELT (ADR 0064), pour que
l'asset ``raw_gkg`` reste une simple orchestration. Faits vérifiés (codebook GKG
2.1) encodés ici :

- **Master file list** : lignes ``<taille> <md5> <url>`` (séparées par des espaces).
  On ne retient que les URL ``*.gkg.csv.zip``.
- **Nom de fichier** : ``YYYYMMDDHHMMSS.gkg.csv.zip`` → le **timestamp** (14 chiffres)
  ordonne le flux (lexicographique = chronologique) et rattache chaque fichier à sa
  partition journalière (8 premiers chiffres = ``YYYYMMDD``).
- **Contenu** : un ZIP d'un unique ``.gkg.csv`` **tab-delimited** (l'extension
  ``.csv`` est trompeuse : le séparateur est la TABULATION), **sans en-tête**,
  **27 colonnes** (ordre V2.1).
- **Projection** : on ne garde que les colonnes utiles au chronogramme (ADR 0064) —
  identifiant de document, date, organisations, URL/source, info de traduction.

Aucune dépendance Dagster/réseau ici : `from __future__ import annotations` est OK
(ce module n'est pas introspecté par Dagster — leçon drift D9 ne s'y applique pas).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Indices de colonnes du format GKG 2.1 (ordre du codebook V2.1). Nommés pour être
# auditables : l'ordre a CHANGÉ entre V2.0 et V2.1 — ne jamais présumer un index.
COL_GKGRECORDID = 0
COL_DATE = 1  # V2.1DATE : YYYYMMDDHHMMSS du batch 15 minutes
COL_SOURCE_COMMON_NAME = 3  # V2SourceCommonName : domaine/nom de la source
COL_DOCUMENT_IDENTIFIER = 4  # V2DocumentIdentifier : URL de l'article
COL_V2_ENHANCED_ORGANIZATIONS = 14  # "Nom,offset;Nom,offset;…"
COL_TRANSLATION_INFO = 25  # V2.1TranslationInfo : vide si natif anglais

_GKG_FIELD_COUNT = 27

# Schéma NATIF complet (ADR 0100) : les 27 colonnes V2.1 dans l'ordre du codebook
# (« GDELT 2.0 Global Knowledge Graph Codebook V2.1 », 2015-02-19). L'ordre a CHANGÉ
# entre V2.0 et V2.1 — cette liste EST l'ordre positionnel des champs tab-delimited
# (sans en-tête). Identifiants NEUTRES snake_case exploitables en Parquet/SQL (le
# « . » de « V2.1DATE » n'est pas un identifiant valide) ; le nom de codebook est en
# commentaire pour l'auditabilité. Les 6 indices projetés ci-dessus (0,1,3,4,14,25)
# sont un sous-ensemble cohérent de cette liste.
NATIVE_COLUMNS = (
    "gkg_record_id",  # 0  GKGRECORDID
    "v21_date",  # 1  V2.1DATE
    "v2_source_collection_identifier",  # 2  V2SourceCollectionIdentifier
    "v2_source_common_name",  # 3  V2SourceCommonName
    "v2_document_identifier",  # 4  V2DocumentIdentifier
    "v1_counts",  # 5  V1Counts
    "v21_counts",  # 6  V2.1Counts
    "v1_themes",  # 7  V1Themes
    "v2_enhanced_themes",  # 8  V2EnhancedThemes
    "v1_locations",  # 9  V1Locations
    "v2_enhanced_locations",  # 10 V2EnhancedLocations
    "v1_persons",  # 11 V1Persons
    "v2_enhanced_persons",  # 12 V2EnhancedPersons
    "v1_organizations",  # 13 V1Organizations
    "v2_enhanced_organizations",  # 14 V2EnhancedOrganizations
    "v15_tone",  # 15 V1.5Tone
    "v21_enhanced_dates",  # 16 V2.1EnhancedDates
    "v2_gcam",  # 17 V2GCAM
    "v21_sharing_image",  # 18 V2.1SharingImage
    "v21_related_images",  # 19 V2.1RelatedImages
    "v21_social_image_embeds",  # 20 V2.1SocialImageEmbeds
    "v21_social_video_embeds",  # 21 V2.1SocialVideoEmbeds
    "v21_quotations",  # 22 V2.1Quotations
    "v21_all_names",  # 23 V2.1AllNames
    "v21_amounts",  # 24 V2.1Amounts
    "v21_translation_info",  # 25 V2.1TranslationInfo
    "v2_extras_xml",  # 26 V2ExtrasXML
)
assert len(NATIVE_COLUMNS) == _GKG_FIELD_COUNT  # garde-fou : 27 colonnes exactement

# Nom de fichier 15 minutes du flux GKG (anglais ou traduit ; le suffixe diffère
# seulement par la présence de "translation." côté master-translation, mais le nom
# d'objet reste <ts>.gkg.csv.zip).
_GKG_FILE_RE = re.compile(r"(\d{14})\.gkg\.csv\.zip$")


@dataclass(frozen=True)
class GkgFile:
    """Une entrée de la master file list pointant un fichier GKG 15 minutes."""

    timestamp: str  # 14 chiffres YYYYMMDDHHMMSS
    url: str


def parse_master_list(text: str) -> list[GkgFile]:
    """Extrait les fichiers ``*.gkg.csv.zip`` d'une master file list.

    Chaque ligne utile est ``<taille> <md5> <url>`` ; on ignore les lignes vides,
    malformées, ou pointant un autre type (``.export.CSV.zip``, ``.mentions.CSV.zip``).
    Le résultat est trié par timestamp croissant (= ordre chronologique).
    """
    files: list[GkgFile] = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 3:
            continue
        url = parts[-1]
        match = _GKG_FILE_RE.search(url)
        if match:
            files.append(GkgFile(timestamp=match.group(1), url=url))
    return sorted(files, key=lambda f: f.timestamp)


def day_prefix(partition_date: str) -> str:
    """``YYYY-MM-DD`` → préfixe de timestamp ``YYYYMMDD`` (8 chiffres).

    Un fichier GKG appartient au jour ``partition_date`` si son timestamp (14
    chiffres) commence par ce préfixe.
    """
    return partition_date.replace("-", "")


def files_in_day(
    files: list[GkgFile], partition_date: str, limit: int
) -> tuple[list[GkgFile], bool]:
    """Sélectionne les fichiers du jour ``partition_date``, triés, bornés à ``limit``.

    La **partition temporelle** (jour) est le curseur d'ingestion (ADR 0064, PR 4) :
    matérialiser une partition rapatrie tous les fichiers 15 minutes de ce jour. Le
    bornage ``limit`` protège des runs trop volumineux ; renvoie ``(retenus, tronqué)``
    où ``tronqué`` signale qu'il restait des fichiers du jour au-delà de ``limit``
    (re-matérialiser la partition avec un ``limit`` plus haut les rapatrie).
    """
    prefix = day_prefix(partition_date)
    same_day = [f for f in files if f.timestamp.startswith(prefix)]
    kept = same_day[:limit]
    return kept, len(same_day) > len(kept)


@dataclass(frozen=True)
class OrgMention:
    """Une mention d'organisation projetée d'une ligne GKG (avant classification)."""

    record_id: str
    date: str  # YYYYMMDDHHMMSS
    organization: str  # nom brut (normalisé anglais par Translingual en amont)
    source_common_name: str
    document_identifier: str  # URL de l'article
    translated: bool  # True si l'article d'origine n'était pas en anglais


def _split_enhanced_organizations(field: str) -> list[str]:
    """Décompose ``V2ENHANCEDORGANIZATIONS`` en noms d'organisations.

    Format : ``Nom,offset;Nom,offset;…`` — entrées séparées par ``;`` ; au sein
    d'une entrée, le nom puis ``,`` puis l'offset (caractère, approximatif). Le nom
    peut contenir des virgules : l'offset est le **dernier** champ numérique, on
    retire donc le suffixe ``,<digits>`` final. Doublons conservés (chaque mention
    est une entrée séparée dans le GKG) puis dédupliqués ici par robustesse.
    """
    names: list[str] = []
    for entry in field.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        # Retire l'offset final ",<digits>" s'il est présent (le nom peut avoir des
        # virgules internes ; seul le dernier segment numérique est l'offset).
        name = re.sub(r",\d+$", "", entry).strip()
        if name:
            names.append(name)
    # Déduplication en préservant l'ordre (un même nom peut apparaître plusieurs fois).
    seen: set[str] = set()
    unique: list[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            unique.append(name)
    return unique


def project_row(fields: list[str]) -> list[OrgMention]:
    """Projette une ligne GKG 2.1 (27 colonnes tab-delimited) en mentions d'org.

    Une ligne GKG = un document. On émet une ``OrgMention`` par organisation
    distincte détectée dans le document. Les lignes sans organisation, ou au nombre
    de colonnes inattendu (ligne tronquée), sont ignorées silencieusement (robustesse
    du flux brut ; la conformité globale est vérifiée par la suite Great Expectations).
    """
    if len(fields) < _GKG_FIELD_COUNT:
        return []
    record_id = fields[COL_GKGRECORDID].strip()
    date = fields[COL_DATE].strip()
    if not record_id or not date:
        return []
    orgs = _split_enhanced_organizations(fields[COL_V2_ENHANCED_ORGANIZATIONS])
    if not orgs:
        return []
    translated = bool(fields[COL_TRANSLATION_INFO].strip())
    source = fields[COL_SOURCE_COMMON_NAME].strip()
    document = fields[COL_DOCUMENT_IDENTIFIER].strip()
    return [
        OrgMention(
            record_id=record_id,
            date=date,
            organization=org,
            source_common_name=source,
            document_identifier=document,
            translated=translated,
        )
        for org in orgs
    ]


def project_csv(text: str) -> list[OrgMention]:
    """Projette un fichier ``.gkg.csv`` complet (tab-delimited, sans en-tête)."""
    mentions: list[OrgMention] = []
    for line in text.splitlines():
        if not line.strip():
            continue
        mentions.extend(project_row(line.split("\t")))
    return mentions


# ── Couche NATIVE : copie fidèle des 27 champs (ADR 0100) ────────────────────────
# À la différence de ``project_row`` (6 champs, éclatés par organisation), la couche
# native conserve la LIGNE telle quelle (un document = une ligne) avec ses 27 champs
# en texte. Aucun typage ni parsing des sous-structures ici : la fidélité prime, le
# typage est un travail AVAL (dbt). Sert l'écriture Parquet de ``raw_native_gkg``.


def parse_native_row(fields: list[str]) -> dict[str, str] | None:
    """Projette une ligne GKG 2.1 en dict de ses 27 champs (copie fidèle, VARCHAR).

    Renvoie un dict ``{nom_neutre: valeur}`` clé par ``NATIVE_COLUMNS`` (ordre du
    codebook). Les lignes au nombre de colonnes inattendu (tronquées) sont ignorées
    (``None``) — même robustesse que ``project_row`` (le flux brut peut contenir des
    lignes malformées ; la conformité globale est vérifiée par Great Expectations).
    Les champs EXCÉDENTAIRES (rare : une tabulation résiduelle en fin de ligne) sont
    ignorés au-delà des 27 attendus ; on ne tronque jamais en-deçà.
    """
    if len(fields) < _GKG_FIELD_COUNT:
        return None
    return {name: fields[i].strip() for i, name in enumerate(NATIVE_COLUMNS)}


def parse_native_csv(text: str) -> list[dict[str, str]]:
    """Projette un ``.gkg.csv`` complet en lignes natives (27 champs, tab-delimited)."""
    rows: list[dict[str, str]] = []
    for line in text.splitlines():
        if not line.strip():
            continue
        row = parse_native_row(line.split("\t"))
        if row is not None:
            rows.append(row)
    return rows


def project_native_dict(row: dict[str, str]) -> list[OrgMention]:
    """Projette une ligne NATIVE (dict 27 champs) en mentions d'organisation.

    Pont de la couche native vers la couche projetée (ADR 0100) :
    ``raw_gkg`` DÉRIVE sa projection 6 champs du Parquet natif au lieu de re-télécharger
    la source. Réutilise EXACTEMENT la même logique d'éclatement/déduplication des
    organisations que ``project_row`` (source unique de vérité) — seule l'origine des
    champs change (dict natif vs liste positionnelle). Robustesse identique : ligne sans
    identifiant/date ou sans organisation → aucune mention.
    """
    record_id = row.get("gkg_record_id", "").strip()
    date = row.get("v21_date", "").strip()
    if not record_id or not date:
        return []
    orgs = _split_enhanced_organizations(row.get("v2_enhanced_organizations", ""))
    if not orgs:
        return []
    translated = bool(row.get("v21_translation_info", "").strip())
    source = row.get("v2_source_common_name", "").strip()
    document = row.get("v2_document_identifier", "").strip()
    return [
        OrgMention(
            record_id=record_id,
            date=date,
            organization=org,
            source_common_name=source,
            document_identifier=document,
            translated=translated,
        )
        for org in orgs
    ]

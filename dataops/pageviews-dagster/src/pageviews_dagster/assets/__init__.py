"""Assets DataOps de la code-location « pageviews ».

Lots (série MENSUELLE des vues Wikipédia par établissement, saisonnalité annuelle) :
- ``ref_universities`` — ingestion du RÉFÉRENTIEL (établissement ↔ titres d'article,
  jointure ROR entre catalogue d'organisations et base collaborative) ;
- ``raw_pageviews`` — collecte des vues mensuelles par établissement (source HTTP :
  API Pageviews en proto, dumps ``pageview_complete`` en cible), grain
  ``(university_id, month, views)`` ;
- ``forecast_views`` — modèle GLOBAL de prévision servant le mart
  ``marts/views_forecast/`` (ADR 0098) ;
- ``forecast_manifest`` — contrat ``manifest.json`` atomique du mart servi (ADR 0029).

Asset checks (portes de qualité/dérive) :
- ``ge_raw_pageviews`` / ``ge_marts_views_forecast`` — Great Expectations BLOQUANTS
  sur le brut et sur le mart servi ;
- ``evidently_forecast_drift`` — suivi de DÉRIVE du modèle de prévision (ADR 0098/0068).
"""

from pageviews_dagster.assets.drift_forecast import evidently_forecast_drift
from pageviews_dagster.assets.forecast import forecast_views
from pageviews_dagster.assets.manifest import forecast_manifest
from pageviews_dagster.assets.quality import ge_marts_views_forecast, ge_raw_pageviews
from pageviews_dagster.assets.raw_pageviews import raw_pageviews
from pageviews_dagster.assets.ref_universities_snapshot import ref_universities

__all__ = [
    "evidently_forecast_drift",
    "forecast_manifest",
    "forecast_views",
    "ge_marts_views_forecast",
    "ge_raw_pageviews",
    "raw_pageviews",
    "ref_universities",
]

"""Partitions GKG ingérées — signal de « donnée neuve » partagé (PUR, sans I/O).

Une partition ingérée = un dossier ``dt=YYYY-MM-DD`` sous ``raw/gkg/`` (cf. raw_gkg :
``raw/gkg/dt=<date>/run=<id>/…``). Ce signal d'avancée de l'ingestion est lu par DEUX
mécanismes : le CT par signal (``transform_on_ingestion_advance``, definitions.py) et le
garde-fou anti-emballement de la boucle drift→retrain (``drift_forecast.py`` persiste les
partitions vues dans le verdict ; ADR 0082). Module neutre pour éviter une dépendance
circulaire entre ``definitions`` et ``assets/drift_forecast``.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import re

_DT_RE = re.compile(r"(?:^|/)dt=(\d{4}-\d{2}-\d{2})(?:/|$)")


def ingested_partitions(entries: list[dict]) -> set:
    """Extrait les dates de partition (``dt=YYYY-MM-DD``) distinctes d'un lsjson de raw/gkg.

    ``entries`` = sortie ``rclone lsjson -R`` (champs ``Path`` relatif au préfixe listé).
    Best-effort : un chemin sans ``dt=`` conforme est ignoré (ne casse pas le scan).
    """
    found = set()
    for entry in entries:
        match = _DT_RE.search(entry.get("Path", ""))
        if match:
            found.add(match.group(1))
    return found

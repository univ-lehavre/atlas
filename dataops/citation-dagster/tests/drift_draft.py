"""Écriture d'un brouillon de drift au point d'échec pytest (ADR 0080, volet a).

Pendant Python du capteur Node ``scripts/drifts/draft.mjs`` : sur échec d'un test
du harnais DataOps, on dépose un brouillon **local, gitignoré, jamais commité**
capturant le ``symptome`` à chaud (le message d'erreur tel qu'il s'affiche), pour
que l'humain n'ait plus à le reconstituer de mémoire.

Le brouillon n'est PAS une entrée de registre : ``pnpm drift:new`` (ADR 0080,
volet b) le promeut ensuite en entrée conforme, APRÈS jugement humain « marquant »
(ADR 0056). Le format JSON est **identique** à celui du capteur Node (même schéma,
mêmes clés) pour qu'un seul CLI de promotion lise les deux sources.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

# Dossier des brouillons, à la racine du dépôt (gitignoré, cf. `.gitignore`).
# parents[3] depuis dataops/citation-dagster/tests/drift_draft.py → racine du
# dépôt (même niveau que FIXTURES_DIR dans conftest.py).
DRAFTS_DIR = Path(__file__).resolve().parents[3] / ".drifts-drafts"

# Version du contrat de brouillon — DOIT rester alignée sur `draft.mjs`.
_DRAFT_SCHEMA = 1


def _bound_symptom(message: str, max_len: int = 1200) -> str:
    """Borne un message d'erreur pour qu'un brouillon reste lisible (même règle
    que ``boundSymptom`` côté Node). Le détail complet reste dans la sortie pytest."""
    trimmed = (message or "").strip()
    return f"{trimmed[:max_len]}\n…(tronqué)" if len(trimmed) > max_len else trimmed


def _draft_filename(source: str, now: datetime, discriminator: str = "") -> str:
    """Nom de fichier unique et trié dans le temps (même forme que ``draftFilename``
    côté Node) : horodatage compact + source assainie + suffixe d'unicité."""
    stamp = now.isoformat().replace(":", "-").replace(".", "-")
    safe_source = "".join(c if c.isalnum() else "-" for c in source).strip("-")
    tail = f"-{discriminator}" if discriminator else ""
    return f"{stamp}-{safe_source}{tail}.drift.json"


def write_draft(
    *,
    source: str,
    symptome: str,
    campagne: str = "",
    discriminator: str = "",
    now: datetime | None = None,
) -> Path | None:
    """Écrit un brouillon de drift dans ``DRAFTS_DIR``.

    N'échoue JAMAIS le run en cours : la capture est un service rendu, pas un test.
    Une erreur d'écriture est avalée (le test garde son verdict d'origine).
    Retourne le chemin écrit, ou ``None`` si l'écriture a échoué.
    """
    moment = now or datetime.now(timezone.utc)
    try:
        DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
        path = DRAFTS_DIR / _draft_filename(source, moment, discriminator)
        payload = {
            "schema": _DRAFT_SCHEMA,
            "source": source,
            "symptome": _bound_symptom(symptome),
            "campagne": campagne,
            "capturedAt": moment.isoformat(),
        }
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        return path
    except OSError as exc:  # pragma: no cover - capture best-effort
        # La capture ne doit jamais masquer ni aggraver l'échec du test lui-même.
        import sys

        sys.stderr.write(f"[drift] capture du brouillon impossible (ignoré) : {exc}\n")
        return None

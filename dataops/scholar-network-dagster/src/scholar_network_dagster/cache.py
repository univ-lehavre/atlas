"""Cache du brut pré-filtré — gradient piloté par ``persistence.mode`` (ADR 0103 §3).

Le curseur cluster ``persistence.mode`` (ADR cluster 0109) descend jusqu'ici par une
SEULE variable d'instance, ``SCHOLAR_NETWORK_PERSISTENCE_MODE`` (Voie A env, patron
ADR 0102), défaut ``full``. **Le terme « persistence » est, pour cette code-location, un
abus** : ce qui varie avec le mode n'est pas une rétention de données produites mais la
**conservation d'un intermédiaire recalculable** — le **brut pré-filtré** (``≥2016 ∧
type=article``, projeté). Le reconstruire coûte un balayage complet du lac ; le mode
choisit COMBIEN DE TEMPS on le garde :

- ``full``      → cache PERSISTANT : brut pré-filtré écrit sur S3, relu tel quel au run
                  suivant (0 balayage source neuf) ;
- ``bounded``   → cache TRANSITOIRE : matérialisé le temps du run (préfixe éphémère purgé
                  en fin de run), partagé par les deux passes → 1 balayage/run ;
- ``ephemeral`` → PAS de cache : jamais matérialisé, chaque passe reconstitue à la volée →
                  jusqu'à 2 balayages/run.

**Invariant clé (ADR 0103 §3)** : le mode est PUREMENT une optimisation d'egress/stockage
— la **correction ne dépend jamais du mode** (recompute intégral, résultat identique).
``full`` est le mode le plus conservateur (garde le cache) = **fail-safe**, cohérent avec la
doctrine cluster (``full`` = défaut). Défensif : mode absent / inconnu / vide → ``full``.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt dataops, drift D9).
"""

import enum
import os

_ENV_VAR = "SCHOLAR_NETWORK_PERSISTENCE_MODE"


class CacheMode(enum.Enum):
    """Stratégie de matérialisation du brut pré-filtré (le vrai nom de ``persistence.mode``).

    ``PERSISTENT`` (full)  : gardé sur S3 entre les runs.
    ``TRANSIENT`` (bounded): gardé le temps du run (purgé en fin).
    ``NONE`` (ephemeral)   : jamais matérialisé (recalcul à la volée).
    """

    PERSISTENT = "full"
    TRANSIENT = "bounded"
    NONE = "ephemeral"

    @property
    def materializes(self) -> bool:
        """Vrai si le brut pré-filtré est écrit quelque part (S3 durable ou préfixe éphémère)."""
        return self is not CacheMode.NONE

    @property
    def persists_between_runs(self) -> bool:
        """Vrai si le cache SURVIT au run (relu tel quel au run suivant) — ``full`` seulement."""
        return self is CacheMode.PERSISTENT

    @property
    def purge_after_run(self) -> bool:
        """Vrai si le cache matérialisé doit être PURGÉ en fin de run — ``bounded`` seulement."""
        return self is CacheMode.TRANSIENT


# Correspondance valeur d'env (insensible à la casse) → mode. Toute autre valeur → ``full``.
_BY_VALUE = {m.value: m for m in CacheMode}


def resolve_cache_mode(env: dict | None = None) -> CacheMode:
    """Lit ``SCHOLAR_NETWORK_PERSISTENCE_MODE`` → ``CacheMode`` (défaut/inconnu → ``full``).

    Défensif (ADR 0103 §3, patron ADR 0102) : absent / inconnu / vide / espaces →
    ``CacheMode.PERSISTENT`` (``full``) = fail-safe, jamais de crash pour un env mal formé.
    La valeur littérale non substituée d'un éventuel placeholder est un « mode inconnu » et
    dégrade donc en ``full`` — le mode le plus conservateur.
    """
    env = env if env is not None else os.environ
    raw = (env.get(_ENV_VAR) or "full").strip().lower()
    return _BY_VALUE.get(raw, CacheMode.PERSISTENT)

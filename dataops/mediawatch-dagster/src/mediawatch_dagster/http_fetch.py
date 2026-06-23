"""Client HTTP robuste face au RATE-LIMITING (ADR 0064).

La source GDELT (``data.gdeltproject.org``) impose des limites de débit non
documentées précisément : un pull naïf (jusqu'à 96 fichiers/jour en boucle serrée,
backfill de partitions en parallèle) provoque des **HTTP 429** voire un bannissement
de l'IP de sortie du cluster. Ce module centralise les garde-fous :

- **Retry avec backoff exponentiel** sur ``429`` et ``5xx`` ; respecte l'en-tête
  ``Retry-After`` (secondes) quand le serveur le fournit.
- **Throttle** : un délai minimal entre deux requêtes (débit borné).

La **limite de concurrence** du backfill (ne pas lancer N partitions en parallèle)
relève de l'orchestrateur (tag Dagster ``max_concurrent``), pas de ce module.

Conçu **testable sans attente réelle** : l'horloge (``sleep``/``monotonic``) est
injectable. Aucune dépendance Dagster ici.

NB : pas de ``from __future__ import annotations`` — importé par des modules que
Dagster introspecte ; on reste cohérent avec le dépôt (drift D9).
"""

import time
from collections.abc import Callable
from dataclasses import dataclass

import httpx


class RateLimitError(RuntimeError):
    """Le serveur a renvoyé 429/5xx au-delà du nombre de tentatives autorisé."""


@dataclass(frozen=True)
class RetryPolicy:
    """Paramètres de robustesse du client (défauts prudents, surchargeables)."""

    max_attempts: int = 5
    """Nombre total de tentatives par requête (1 = pas de retry)."""

    backoff_base_s: float = 1.0
    """Base du backoff exponentiel : attente ≈ ``base * 2**(tentative-1)`` secondes."""

    backoff_cap_s: float = 60.0
    """Plafond d'attente entre deux tentatives (borne le backoff exponentiel)."""

    min_interval_s: float = 1.0
    """Délai minimal entre deux requêtes (throttle ; ≈ 1 req/s par défaut)."""

    timeout_s: float = 60.0
    """Timeout d'une requête HTTP."""


_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _retry_after_seconds(response: httpx.Response) -> float | None:
    """Lit l'en-tête ``Retry-After`` (forme « secondes ») ; ``None`` si absent/invalide."""
    raw = response.headers.get("Retry-After")
    if not raw:
        return None
    try:
        return max(0.0, float(raw.strip()))
    except ValueError:
        return None  # forme « HTTP-date » non gérée (rare sur ce service)


def _backoff_delay(policy: RetryPolicy, attempt: int, response: httpx.Response | None) -> float:
    """Délai avant la prochaine tentative : ``Retry-After`` s'il existe, sinon backoff exp."""
    if response is not None:
        hinted = _retry_after_seconds(response)
        if hinted is not None:
            return min(hinted, policy.backoff_cap_s)
    return min(policy.backoff_base_s * (2 ** (attempt - 1)), policy.backoff_cap_s)


class ThrottledClient:
    """Client HTTP avec throttle + retry/backoff sur 429/5xx.

    ``get_bytes`` / ``get_text`` appliquent : (1) un throttle (au moins
    ``min_interval_s`` entre deux requêtes), (2) un retry avec backoff sur statut
    retryable ou erreur réseau transitoire. ``sleep`` et ``monotonic`` sont injectés
    pour des tests déterministes (aucune attente réelle).
    """

    def __init__(
        self,
        policy: RetryPolicy | None = None,
        *,
        get: Callable[..., httpx.Response] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self._policy = policy or RetryPolicy()
        self._get = get or httpx.get
        self._sleep = sleep
        self._monotonic = monotonic
        self._last_request_at: float | None = None

    def _throttle(self) -> None:
        """Attend pour respecter ``min_interval_s`` depuis la dernière requête."""
        if self._last_request_at is not None:
            elapsed = self._monotonic() - self._last_request_at
            wait = self._policy.min_interval_s - elapsed
            if wait > 0:
                self._sleep(wait)
        self._last_request_at = self._monotonic()

    def _request(self, url: str) -> httpx.Response:
        """Exécute la requête avec throttle + retry/backoff ; lève sur échec final."""
        policy = self._policy
        last_exc: Exception | None = None
        for attempt in range(1, policy.max_attempts + 1):
            self._throttle()
            response = None
            try:
                response = self._get(url, timeout=policy.timeout_s, follow_redirects=True)
            except httpx.TransportError as exc:
                # Erreur réseau transitoire (DNS, connexion, timeout) → retry.
                last_exc = exc
            else:
                if response.status_code not in _RETRYABLE_STATUS:
                    response.raise_for_status()
                    return response
                last_exc = RateLimitError(f"HTTP {response.status_code} sur {url}")
            if attempt < policy.max_attempts:
                self._sleep(_backoff_delay(policy, attempt, response))
        raise RateLimitError(f"Échec après {policy.max_attempts} tentatives sur {url} : {last_exc}")

    def get_bytes(self, url: str) -> bytes:
        """Télécharge le corps en octets (fichiers ZIP)."""
        return self._request(url).content

    def get_text(self, url: str) -> str:
        """Télécharge le corps en texte (master lists)."""
        return self._request(url).text

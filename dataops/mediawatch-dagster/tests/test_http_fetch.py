"""Tests du client HTTP robuste (retry/backoff/throttle) — sans attente réelle."""

import httpx
import pytest

from mediawatch_dagster.http_fetch import RateLimitError, RetryPolicy, ThrottledClient


class _Resp:
    def __init__(self, status: int = 200, *, text: str = "", content: bytes = b"", headers=None):
        self.status_code = status
        self.text = text
        self.content = content
        self.headers = headers or {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("err", request=None, response=None)


class _Clock:
    """Horloge factice : sleep enregistré, monotonic avance du temps dormi."""

    def __init__(self) -> None:
        self.now = 0.0
        self.slept: list[float] = []

    def sleep(self, s: float) -> None:
        self.slept.append(s)
        self.now += s

    def monotonic(self) -> float:
        return self.now


def _client(responses, policy=None, clock=None):
    clock = clock or _Clock()
    calls = {"n": 0}

    def fake_get(url, **kwargs):
        r = responses[min(calls["n"], len(responses) - 1)]
        calls["n"] += 1
        if isinstance(r, Exception):
            raise r
        return r

    c = ThrottledClient(policy, get=fake_get, sleep=clock.sleep, monotonic=clock.monotonic)
    return c, clock, calls


def test_success_first_try_no_sleep() -> None:
    c, clock, calls = _client([_Resp(200, text="ok")])
    assert c.get_text("http://x") == "ok"
    assert calls["n"] == 1
    # 1re requête : pas de throttle préalable (pas de requête précédente).
    assert clock.slept == []


def test_retries_on_429_then_succeeds() -> None:
    c, clock, calls = _client([_Resp(429), _Resp(429), _Resp(200, content=b"data")])
    assert c.get_bytes("http://x") == b"data"
    assert calls["n"] == 3
    # 2 backoffs (1, 2 s) entre les 3 tentatives ; throttle aussi entre requêtes.
    assert 1.0 in clock.slept and 2.0 in clock.slept


def test_respects_retry_after_header() -> None:
    c, clock, _ = _client([_Resp(429, headers={"Retry-After": "7"}), _Resp(200)])
    c.get_text("http://x")
    # Le délai 7 s (Retry-After) prime sur le backoff exponentiel (1 s).
    assert 7.0 in clock.slept


def test_retry_after_capped() -> None:
    policy = RetryPolicy(backoff_cap_s=5.0)
    c, clock, _ = _client([_Resp(503, headers={"Retry-After": "999"}), _Resp(200)], policy)
    c.get_text("http://x")
    assert 5.0 in clock.slept  # plafonné au cap


def test_gives_up_after_max_attempts() -> None:
    policy = RetryPolicy(max_attempts=3)
    c, _, calls = _client([_Resp(429), _Resp(429), _Resp(429), _Resp(429)], policy)
    with pytest.raises(RateLimitError, match="3 tentatives"):
        c.get_text("http://x")
    assert calls["n"] == 3


def test_retries_on_transport_error() -> None:
    c, _, calls = _client([httpx.ConnectError("dns"), _Resp(200, text="ok")])
    assert c.get_text("http://x") == "ok"
    assert calls["n"] == 2


def test_throttle_waits_between_requests() -> None:
    clock = _Clock()
    policy = RetryPolicy(min_interval_s=2.0)
    c, clock, _ = _client([_Resp(200), _Resp(200)], policy, clock)
    c.get_text("http://x")  # t=0
    c.get_text("http://y")  # doit attendre 2 s (throttle)
    assert 2.0 in clock.slept


def test_non_retryable_4xx_raises_immediately() -> None:
    c, _, calls = _client([_Resp(404)])
    with pytest.raises(httpx.HTTPStatusError):
        c.get_text("http://x")
    # 404 n'est pas retryable → une seule tentative.
    assert calls["n"] == 1

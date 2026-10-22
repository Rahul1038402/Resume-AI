"""Caller identification and a daily quota, shared by the AI routes.

The AI assistant grew its own limiter first. The analyser had none at all,
which mattered more than it looked: Groq's free tier caps daily *tokens*
(~200k) long before daily requests, and one analysis costs ~3,000 of them, so
a single visitor could drain the budget for everyone in an afternoon.

Both now identify callers the same way and prune the same way. The counting
policies differ and stay where they belong: the assistant tracks per-section
and per-session totals, the analyser just counts scans.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, Tuple

from flask import request

logger = logging.getLogger(__name__)

RESET_HOURS = 24
MAX_TRACKED_KEYS = 5000


def get_client_key() -> str:
    """Identify the caller for rate limiting.

    Prefers the real client IP behind Render/Vercel proxies. A session id
    posted by the browser is not trusted: it is regenerated on every mount,
    which made the limits resettable by reloading the page.

    Everyone behind one NAT shares a bucket. That is the deliberate trade for
    not trusting client-supplied identity, and it is the main source of false
    positives on an office or campus network.
    """
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def prune_expired(store: Dict[str, dict], current_time: datetime) -> None:
    """Drop expired buckets so a dict cannot grow without bound."""
    expired = [
        key for key, counts in store.items()
        if current_time - counts["last_reset"] > timedelta(hours=RESET_HOURS)
    ]
    for key in expired:
        del store[key]

    # Backstop against many short-lived clients.
    if len(store) > MAX_TRACKED_KEYS:
        oldest = sorted(store.items(), key=lambda kv: kv[1]["last_reset"])
        for key, _ in oldest[:len(store) - MAX_TRACKED_KEYS]:
            del store[key]


class DailyLimiter:
    """A fixed number of actions per caller per rolling 24 hours.

    In-process, like the assistant's limiter: a restart clears it, and two
    instances count separately. Fine for a single free-tier box; a shared
    store is the fix if this ever runs more than one worker process.
    """

    def __init__(self, limit: int, name: str = "action"):
        self.limit = limit
        self.name = name
        self.counts: Dict[str, dict] = {}

    def check(self, client: str | None = None) -> Tuple[bool, dict]:
        """Spend one unit if there is one. Returns (allowed, info).

        A refused call does not consume quota, so a user who hits the wall
        does not have their window extended by retrying.
        """
        key = client or get_client_key()
        now = datetime.now()
        prune_expired(self.counts, now)

        bucket = self.counts.get(key)
        if bucket is None:
            bucket = self.counts[key] = {"used": 0, "last_reset": now}
        elif now - bucket["last_reset"] > timedelta(hours=RESET_HOURS):
            bucket["used"] = 0
            bucket["last_reset"] = now

        resets_at = bucket["last_reset"] + timedelta(hours=RESET_HOURS)
        remaining_seconds = max(0, int((resets_at - now).total_seconds()))

        if bucket["used"] >= self.limit:
            logger.info("%s limit reached for %s (%d/%d)",
                        self.name, key, bucket["used"], self.limit)
            return False, {
                "error": f"Daily limit reached ({self.limit} {self.name}s per day)",
                "limit": self.limit,
                "remaining": 0,
                "used": bucket["used"],
                "resets_in_seconds": remaining_seconds,
                "resets_at": resets_at.isoformat(timespec="seconds"),
            }

        bucket["used"] += 1
        return True, {
            "limit": self.limit,
            "remaining": max(0, self.limit - bucket["used"]),
            "used": bucket["used"],
            "resets_in_seconds": remaining_seconds,
            "resets_at": resets_at.isoformat(timespec="seconds"),
        }

    def peek(self, client: str | None = None) -> dict:
        """What is left, without spending any."""
        key = client or get_client_key()
        bucket = self.counts.get(key)
        used = bucket["used"] if bucket else 0
        return {"limit": self.limit, "used": used,
                "remaining": max(0, self.limit - used)}

    def refund(self, client: str | None = None) -> None:
        """Give a unit back, for a scan that never produced a result."""
        key = client or get_client_key()
        bucket = self.counts.get(key)
        if bucket and bucket["used"] > 0:
            bucket["used"] -= 1

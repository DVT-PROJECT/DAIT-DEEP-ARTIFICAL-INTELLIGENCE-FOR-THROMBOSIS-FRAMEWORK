"""Background idle shutdown when the desktop UI stops sending heartbeats (tab closed / all clients gone)."""

from __future__ import annotations

import os
import threading
import time

from .settings import settings

_lock = threading.Lock()
_last_ping_mono: float | None = None


def mark_ping() -> None:
    global _last_ping_mono
    with _lock:
        _last_ping_mono = time.monotonic()


def _loop() -> None:
    while True:
        time.sleep(10)
        if os.environ.get("DAIT_DISABLE_IDLE_SHUTDOWN") == "1":
            continue
        if not settings.shutdown_token:
            continue
        with _lock:
            t = _last_ping_mono
        if t is None:
            continue
        if time.monotonic() - t > float(settings.idle_shutdown_seconds):
            os._exit(0)


def start() -> None:
    if not settings.shutdown_token:
        return
    threading.Thread(target=_loop, daemon=True, name="dait-idle-shutdown").start()

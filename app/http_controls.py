from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic


class SlidingWindowRateLimiter:
    """Small process-local guard for credit-consuming and state-changing routes."""

    def __init__(self, limit: int, window_seconds: int = 60) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, now: float | None = None) -> tuple[bool, int]:
        current = monotonic() if now is None else now
        cutoff = current - self.window_seconds
        with self._lock:
            history = self._requests[key]
            while history and history[0] <= cutoff:
                history.popleft()
            if len(history) >= self.limit:
                retry_after = max(1, int(self.window_seconds - (current - history[0])) + 1)
                return False, retry_after
            history.append(current)
            return True, 0

from app.http_controls import SlidingWindowRateLimiter


def test_sliding_window_rate_limiter_resets_after_the_window():
    limiter = SlidingWindowRateLimiter(limit=2, window_seconds=10)

    assert limiter.allow("operator", now=0) == (True, 0)
    assert limiter.allow("operator", now=1) == (True, 0)
    allowed, retry_after = limiter.allow("operator", now=2)
    assert allowed is False
    assert retry_after == 9
    assert limiter.allow("operator", now=11) == (True, 0)


def test_rate_limit_keys_are_isolated():
    limiter = SlidingWindowRateLimiter(limit=1)

    assert limiter.allow("first", now=0)[0] is True
    assert limiter.allow("first", now=1)[0] is False
    assert limiter.allow("second", now=1)[0] is True

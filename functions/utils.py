"""Shared helpers for request parsing and safe numeric conversion."""


def safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def safe_int(val, default=10):
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default

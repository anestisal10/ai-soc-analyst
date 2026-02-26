"""
Shared IoC utility helpers used across analyzer and threat_intel services.
"""


def is_ip(value: str) -> bool:
    """Returns True if the string looks like a valid IPv4 address."""
    if not value or not isinstance(value, str):
        return False
    parts = value.split(".")
    if len(parts) != 4:
        return False
    try:
        return all(p.isascii() and p.isdigit() and 0 <= int(p) <= 255 for p in parts)
    except ValueError:
        return False

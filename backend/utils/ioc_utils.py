"""
Shared IoC utility helpers used across analyzer and threat_intel services.
"""
import ipaddress


def is_ip(value: str) -> bool:
    """
    Returns True if the string looks like a valid IPv4 or IPv6 address.
    Fix #18: Added IPv6 support using Python's stdlib ipaddress module,
    which handles both IPv4 and IPv6 correctly.
    """
    if not value or not isinstance(value, str):
        return False
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False

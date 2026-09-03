from backend.utils.exceptions import ValidationError, WeakPasswordError

def validate_password_policy(password: str) -> bool:
    """
    Enforces password policy: min 8 chars, 1 upper, 1 lower, 1 number.
    Raises WeakPasswordError if invalid.
    """
    if len(password) < 8:
        raise WeakPasswordError("Password must be at least 8 characters long.")
    if not any(char.isupper() for char in password):
        raise WeakPasswordError("Password must contain at least one uppercase letter.")
    if not any(char.islower() for char in password):
        raise WeakPasswordError("Password must contain at least one lowercase letter.")
    if not any(char.isdigit() for char in password):
        raise WeakPasswordError("Password must contain at least one number.")
    return True

def validate_pagination(limit: int, offset: int) -> bool:
    """Ensures pagination parameters are within sane bounds."""
    if limit < 1 or limit > 1000:
        raise ValidationError("Limit must be between 1 and 1000.")
    if offset < 0:
        raise ValidationError("Offset cannot be negative.")
    return True


import ipaddress
import re

def validate_ip(ip_str: str) -> bool:
    """Returns True if ip_str is a valid IPv4 or IPv6 address."""
    if not ip_str:
        return False
    try:
        ipaddress.ip_address(ip_str)
        return True
    except ValueError:
        return False

def validate_mac(mac_str: str) -> bool:
    """Returns True if mac_str is a valid colon-separated MAC address (XX:XX:XX:XX:XX:XX)."""
    if not mac_str:
        return False
    return bool(re.match(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$", mac_str))

def validate_email(email_str: str) -> bool:
    """Returns True if email_str is a valid email format."""
    if not email_str:
        return False
    return bool(re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email_str))

def is_internal_ip(ip_str: str) -> bool:
    """Returns True if ip_str is a private RFC1918 or loopback IP address."""
    if not ip_str or not isinstance(ip_str, str):
        return False
    # Ultra-fast nanosecond string fast-path for standard RFC1918 IPv4
    if ip_str.startswith("10.") or ip_str.startswith("127.") or ip_str.startswith("192.168."):
        return True
    if ip_str.startswith("172."):
        parts = ip_str.split(".", 2)
        if len(parts) >= 2 and parts[1].isdigit():
            second = int(parts[1])
            if 16 <= second <= 31:
                return True

    if not validate_ip(ip_str):
        return False
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        if ip_obj.version == 4:
            ip_int = int(ip_obj)
            return (
                (ip_int & 0xFF000000 == 0x0A000000) or
                (ip_int & 0xFF000000 == 0x7F000000) or
                (ip_int & 0xFFF00000 == 0xAC100000) or
                (ip_int & 0xFFFF0000 == 0xC0A80000)
            )
        return ip_obj.is_private or ip_obj.is_loopback
    except ValueError:
        return False

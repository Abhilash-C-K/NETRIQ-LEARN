import re
import ipaddress
from backend.utils.exceptions import ValidationError, WeakPasswordError

def validate_ip(ip: str) -> bool:
    """Validates if a string is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def validate_mac(mac: str) -> bool:
    """Validates MAC address format (e.g., 00:1A:2B:3C:4D:5E)."""
    pattern = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')
    return bool(pattern.match(mac))

def validate_email(email: str) -> bool:
    """Simple regex email validation."""
    pattern = re.compile(r'^[\w\.-]+@[\w\.-]+\.\w+$')
    return bool(pattern.match(email))

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

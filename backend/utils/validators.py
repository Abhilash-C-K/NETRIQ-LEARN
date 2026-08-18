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

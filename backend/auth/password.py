import os
import re
import bcrypt
from backend.auth.exceptions import WeakPasswordError

# Configurable work factor (rounds). 12 is a solid default balancing security and latency.
BCRYPT_ROUNDS = int(os.getenv("PASSWORD_HASH_ROUNDS", "12"))

def hash_password(plain_password: str) -> str:
    """Hashes a password using bcrypt with rounds >= 12."""
    pw_bytes = plain_password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=max(12, BCRYPT_ROUNDS))
    hashed = bcrypt.hashpw(pw_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored bcrypt hash in constant time."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        # Catch any malformed hash errors gracefully
        return False

def validate_password_policy(password: str) -> bool:
    """
    Enforces password complexity rules (OWASP ASVS v4.0.3 Level 2 / NIST SP 800-63B):
    - Min 12 characters (ASVS 2.1.1)
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character (ASVS 2.1.7)
    """
    if len(password) < 12:
        raise WeakPasswordError("Password must be at least 12 characters long.")
    if not re.search(r"[A-Z]", password):
        raise WeakPasswordError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise WeakPasswordError("Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", password):
        raise WeakPasswordError("Password must contain at least one number.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", password):
        raise WeakPasswordError("Password must contain at least one special character (!@#$%^&* etc.).")
        
    return True

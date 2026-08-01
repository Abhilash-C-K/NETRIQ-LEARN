import os
import re
from passlib.context import CryptContext
from backend.auth.exceptions import WeakPasswordError

# Configurable work factor (rounds). 12 is a solid default balancing security and latency.
BCRYPT_ROUNDS = int(os.getenv("PASSWORD_HASH_ROUNDS", "12"))

# Setup passlib context explicitly targeting bcrypt with the configured rounds
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=BCRYPT_ROUNDS
)

def hash_password(plain_password: str) -> str:
    """Hashes a password using bcrypt."""
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash in constant time."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Catch any malformed hash errors gracefully
        return False

def validate_password_policy(password: str) -> bool:
    """
    Enforces password complexity rules:
    - Min 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    """
    if len(password) < 8:
        raise WeakPasswordError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise WeakPasswordError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise WeakPasswordError("Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", password):
        raise WeakPasswordError("Password must contain at least one number.")
        
    return True

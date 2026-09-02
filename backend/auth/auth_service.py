import asyncio
import time
import os
import hashlib
from typing import Dict, Any, Optional

from backend.utils.logger import get_logger
from backend.auth.exceptions import (
    InvalidCredentialsError,
    AccountLockedError,
    TokenExpiredError,
    InvalidTokenError,
)
from backend.auth.password import verify_password, hash_password, validate_password_policy
from backend.auth.jwt_handler import (
    create_access_token, 
    create_refresh_token, 
    verify_token
)
from backend.auth.roles import Role
from backend.database.collections import users_repo

logger = get_logger(__name__)

# Configurable lockout settings
LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
LOGIN_LOCKOUT_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))

class AuthService:
    """
    Orchestrates authentication flows: login, logout, refresh, register.
    Owns all business logic for authentication.
    Note: Token extraction from HTTP headers is handled separately by middleware/auth.py.
    """
    async def seed_initial_users(self):
        """Seeds default admin, analyst, and viewer accounts if missing."""
        try:
            demo_users = [
                ("admin@netriq.local", "admin", "AdminPassword123!", Role.ADMIN),
                ("analyst@netriq.local", "analyst", "AnalystPassword123!", Role.ANALYST),
                ("viewer@netriq.local", "viewer", "ViewerPassword123!", Role.VIEWER),
            ]
            for email, uname, pwd, r in demo_users:
                existing = await users_repo.list({"$or": [{"email": email}, {"username": uname}]}, limit=1)
                if not existing:
                    logger.info(f"[AuthService] Seeding default account {uname} ({email})...")
                    await self.register_user("system", email, pwd, r, username=uname)
                else:
                    u_doc = existing[0]
                    if not u_doc.get("username"):
                        await users_repo.update(u_doc["id"], {"username": uname})
        except Exception as e:
            logger.warning(f"[AuthService] User seed warning: {e}")

    @staticmethod
    def _hash_token(token: str) -> str:
        """SHA-256 hash a token before storing — never store raw tokens in DB."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def login(self, email: str, password: str) -> Dict[str, str]:
        """Validates credentials, enforces lockout, issues tokens."""
        # 1. Fetch user by email, username, or local domain alias
        domain_alias = f"{email}@netriq.local" if "@" not in email else email
        query = {"$or": [{"email": email}, {"username": email}, {"email": domain_alias}]}
        users_res = users_repo.list(query, limit=1)
        if asyncio.iscoroutine(users_res) or hasattr(users_res, "__await__"):
            users = await users_res
        else:
            users = users_res
        if not users:
            # We use generic exception to prevent user enumeration
            raise InvalidCredentialsError("Invalid email or password.")
            
        user = users[0]
        user_id = user["id"]
        
        # 2. Check Lockout Status
        now = time.time()
        locked_until = user.get("locked_until", 0)
        if locked_until > now:
            remaining_mins = int((locked_until - now) / 60)
            logger.warning(f"Login attempt on locked account: {email}")
            raise AccountLockedError(f"Account locked. Try again in {remaining_mins} minutes.")
            
        # 3. Verify Password
        if not verify_password(password, user.get("hashed_password", "")):
            # Handle failed attempt
            failed_attempts = user.get("failed_login_attempts", 0) + 1
            updates = {"failed_login_attempts": failed_attempts}
            
            if failed_attempts >= LOGIN_MAX_ATTEMPTS:
                lockout_end = now + (LOGIN_LOCKOUT_MINUTES * 60)
                updates["locked_until"] = lockout_end
                logger.warning(f"Account {email} locked due to too many failed attempts.")
                
            upd_res = users_repo.update(user_id, updates)
            if asyncio.iscoroutine(upd_res) or hasattr(upd_res, "__await__"):
                await upd_res
            raise InvalidCredentialsError("Invalid email or password.")
            
        # 4. Success: Reset lockout counters
        if user.get("failed_login_attempts", 0) > 0 or user.get("locked_until", 0) > 0:
            await users_repo.update(user_id, {"failed_login_attempts": 0, "locked_until": 0})
            
        # 5. Issue Tokens
        role = user.get("role", Role.VIEWER.value)
        access_token = create_access_token(user_id, role)
        refresh_token = create_refresh_token(user_id)
        
        # Store hashed refresh token for revocation — never store plaintext
        await users_repo.update(user_id, {"active_refresh_token_hash": self._hash_token(refresh_token)})
        
        logger.info(f"Successful login for user: {email}")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": role
        }

    async def register_user(self, admin_user_id: str, email: str, raw_password: str, role: Role, username: Optional[str] = None) -> str:
        """Admin only endpoint to create users."""
        # Policy validation
        validate_password_policy(raw_password)
        
        # Check if email exists
        existing = await users_repo.list({"email": email}, limit=1)
        if existing:
            from backend.utils.exceptions import DuplicateKeyError
            raise DuplicateKeyError("Email already registered.")
            
        uname_val = username or email.split("@")[0]
        new_user = {
            "email": email,
            "username": uname_val,
            "hashed_password": hash_password(raw_password),
            "role": role.value,
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": 0,
            "created_by": admin_user_id,
            "created_at": time.time()
        }
        
        user_id = await users_repo.create(new_user)
        logger.info(f"New user registered: {email} with role {role.value} by Admin {admin_user_id}")
        return user_id

    async def refresh_token(self, old_refresh_token: str) -> Dict[str, str]:
        """Validates refresh token, issues new access token & rotates refresh token."""
        # 1. Verify token signature and expiry
        try:
            payload = verify_token(old_refresh_token, expected_type="refresh")
        except (TokenExpiredError, InvalidTokenError) as e:
            logger.warning("Attempt to refresh with invalid/expired token.")
            raise e
            
        user_id = payload.get("sub")
        if not user_id:
            raise InvalidTokenError("Refresh token missing subject (user_id).")
            
        # 2. Fetch user and validate token rotation state
        # In a real app, you might use a dedicated sessions table. Here we use the user doc.
        user = await users_repo.get(user_id)
        if not user or not user.get("is_active", False):
            raise InvalidTokenError("User is inactive or deleted.")
            
        stored_hash = user.get("active_refresh_token_hash")
        
        if stored_hash != self._hash_token(old_refresh_token):
            # Token Rotation Security Alert: 
            # A validly signed old refresh token was used, meaning it might have been stolen and reused.
            # We must revoke ALL access by clearing the stored token.
            logger.critical(f"Token rotation anomaly detected for user {user_id}. Revoking sessions.")
            await users_repo.update(user_id, {"active_refresh_token_hash": None})
            raise InvalidTokenError("Compromised refresh token detected. Please login again.")
            
        # 3. Issue new tokens (Rotation)
        role = user.get("role", Role.VIEWER.value)
        new_access_token = create_access_token(user_id, role)
        new_refresh_token = create_refresh_token(user_id)
        
        # Update stored refresh token hash (rotation)
        await users_repo.update(user_id, {"active_refresh_token_hash": self._hash_token(new_refresh_token)})
        
        logger.info(f"Token refreshed successfully for user: {user_id}")
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    async def logout(self, user_id: str) -> bool:
        """Invalidates the active refresh token."""
        try:
            await users_repo.update(user_id, {"active_refresh_token_hash": None})
            logger.info(f"User logged out successfully: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error during logout for user {user_id}: {e}")
            return False

from pydantic import BaseModel
from backend.auth.roles import Role

from typing import Optional

class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

    @property
    def identity(self) -> str:
        return self.email or self.username or ""

class RefreshRequest(BaseModel):
    refresh_token: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Role

from typing import Optional

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: Optional[str] = None

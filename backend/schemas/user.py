from pydantic import BaseModel, EmailStr
from typing import Optional

class UserPublic(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: float

class UserUpdateReq(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

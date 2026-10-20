from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    created_at: datetime
    must_change_password: bool = True

    class Config:
        from_attributes = True


class AdminChangeCredentials(BaseModel):
    current_password: str
    new_email: EmailStr
    new_full_name: Optional[str] = None
    new_password: str

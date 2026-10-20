from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class StaffCreate(BaseModel):
    """Filled in by the hospital when it creates a login for a staff member."""
    full_name: str
    email: EmailStr
    password: str
    shift: str  # "Shift 1" | "Shift 2" | "Shift 3" | "Shift 4"
    phone_number: Optional[str] = None


class StaffLogin(BaseModel):
    email: EmailStr
    password: str


class StaffOut(BaseModel):
    id: int
    hospital_id: int
    full_name: str
    email: EmailStr
    shift: str
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

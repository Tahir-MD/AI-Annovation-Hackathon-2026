from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class DonorCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    blood_type: str
    phone_number: str
    latitude: float
    longitude: float


class DonorLogin(BaseModel):
    email: EmailStr
    password: str


class DonorOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    blood_type: str
    phone_number: str
    latitude: float
    longitude: float
    is_eligible: bool
    last_donation_date: Optional[datetime] = None
    points: int
    medical_clearance_status: str = "pending"

    class Config:
        from_attributes = True

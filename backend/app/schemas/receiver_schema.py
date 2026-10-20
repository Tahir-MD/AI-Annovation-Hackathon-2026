from pydantic import BaseModel, EmailStr
from typing import Optional


class ReceiverCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone_number: str
    cnic_number: str
    address: str
    patient_name: Optional[str] = None
    latitude: float
    longitude: float


class ReceiverLogin(BaseModel):
    email: EmailStr
    password: str


class ReceiverOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone_number: str
    cnic_number: str
    address: str
    patient_name: Optional[str] = None
    latitude: float
    longitude: float

    class Config:
        from_attributes = True

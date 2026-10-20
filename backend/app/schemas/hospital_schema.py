from pydantic import BaseModel, EmailStr


class HospitalCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    license_number: str
    phone_number: str
    latitude: float
    longitude: float


class HospitalLogin(BaseModel):
    email: EmailStr
    password: str


class HospitalOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    license_number: str
    phone_number: str
    latitude: float
    longitude: float
    is_verified: bool = False

    class Config:
        from_attributes = True

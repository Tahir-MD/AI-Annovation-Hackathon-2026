from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BloodRequestCreate(BaseModel):
    blood_type_needed: str
    units_needed: int = 1
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    medical_reason: Optional[str] = None
    urgency_type: str = "emergency"
    urgency_value: Optional[int] = None
    latitude: float
    longitude: float


class BloodRequestOut(BaseModel):
    id: int
    requester_type: str
    requester_id: int
    requester_name: str
    requester_phone: str
    requester_cnic: Optional[str] = None
    requester_address: Optional[str] = None
    blood_type_needed: str
    units_needed: int
    units_fulfilled: int
    units_remaining: int
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    medical_reason: Optional[str] = None
    urgency_type: str
    urgency_value: Optional[int] = None
    latitude: float
    longitude: float
    status: str
    created_at: datetime
    fulfilled_from_inventory: bool = False
    inventory_units_used: int = 0
    fulfilling_hospital_name: Optional[str] = None


class AcceptRequestInput(BaseModel):
    units_donated: int = 1


class MatchedDonorOut(BaseModel):
    donor_id: int
    full_name: str
    blood_type: str
    phone_number: str
    distance_kilometers: float
    points: int
    average_rating: Optional[float] = None
    match_score: Optional[float] = None
    no_show_risk: Optional[float] = None  # 0..1, higher = less likely to follow through
    match_reason: Optional[str] = None  # short, human-readable "why this donor" explanation

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class VisitorEntryCreate(BaseModel):
    visitor_type: str  # "donor" | "patient"
    full_name: str
    blood_type: Optional[str] = None
    phone_number: Optional[str] = None
    from_location: Optional[str] = None
    notes: Optional[str] = None


class VisitorEntryOut(BaseModel):
    id: int
    staff_id: int
    hospital_id: int
    visitor_type: str
    full_name: str
    blood_type: Optional[str] = None
    phone_number: Optional[str] = None
    from_location: Optional[str] = None
    notes: Optional[str] = None
    logged_at: datetime

    # Filled in by the route, not stored on the row itself, so the
    # hospital's and admin's combined views show who logged each entry.
    staff_name: Optional[str] = None
    staff_shift: Optional[str] = None

    class Config:
        from_attributes = True

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime

from app.database import Base


class Donor(Base):
    __tablename__ = "donors"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    blood_type = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_eligible = Column(Boolean, default=True)
    last_donation_date = Column(DateTime, nullable=True)
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Set by an admin (standing in for a medical provider's sign-off) via
    # the verification panel: "pending" | "cleared" | "flagged".
    # This is separate from is_eligible, which is the donor's own
    # self-reported 90-day cooldown status.
    medical_clearance_status = Column(String, default="pending")
    medical_clearance_notes = Column(String, nullable=True)

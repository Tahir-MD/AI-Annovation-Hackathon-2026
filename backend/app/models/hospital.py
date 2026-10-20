from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime

from app.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    license_number = Column(String, unique=True, nullable=False)
    phone_number = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Set by an admin after checking the hospital's license, through the
    # verification panel -- unverified hospitals can still register and
    # use the platform, but are shown with a "pending verification" badge.
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    verified_by_admin_id = Column(Integer, nullable=True)

    # Two-factor authentication (TOTP, RFC 6238) -- optional, off by default.
    totp_secret = Column(String, nullable=True)
    two_factor_enabled = Column(Boolean, default=False)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.schemas.donor_schema import DonorOut
from app.utils.dependencies import get_current_donor

router = APIRouter(prefix="/donors", tags=["Donors"])


@router.get("/me", response_model=DonorOut)
def read_my_donor_profile(current_donor: Donor = Depends(get_current_donor)):
    return current_donor


@router.get("", response_model=list[DonorOut])
def list_all_donors(db: Session = Depends(get_db)):
    return db.query(Donor).all()

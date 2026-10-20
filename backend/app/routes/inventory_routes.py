from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.inventory import BloodInventory
from app.models.hospital import Hospital
from app.schemas.inventory_schema import InventoryItemOut, InventoryUpdateInput, HospitalInventoryOut
from app.utils.dependencies import get_current_hospital

router = APIRouter(prefix="/inventory", tags=["Blood Inventory"])

BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]


def _ensure_rows_exist(db: Session, hospital_id: int) -> None:
    existing_types = {
        row.blood_type
        for row in db.query(BloodInventory).filter(BloodInventory.hospital_id == hospital_id).all()
    }
    for blood_type in BLOOD_TYPES:
        if blood_type not in existing_types:
            db.add(BloodInventory(hospital_id=hospital_id, blood_type=blood_type, units_available=0))
    db.commit()


def _to_item_out(row: BloodInventory) -> InventoryItemOut:
    return InventoryItemOut(
        blood_type=row.blood_type,
        units_available=row.units_available,
        low_stock_threshold=row.low_stock_threshold,
        is_low=row.units_available <= row.low_stock_threshold,
        updated_at=row.updated_at,
    )


@router.get("/me", response_model=List[InventoryItemOut])
def get_my_inventory(db: Session = Depends(get_db), current_hospital: Hospital = Depends(get_current_hospital)):
    _ensure_rows_exist(db, current_hospital.id)
    rows = db.query(BloodInventory).filter(BloodInventory.hospital_id == current_hospital.id).all()
    return [_to_item_out(r) for r in sorted(rows, key=lambda r: BLOOD_TYPES.index(r.blood_type))]


@router.put("/me", response_model=InventoryItemOut)
def update_my_inventory(
    update: InventoryUpdateInput,
    db: Session = Depends(get_db),
    current_hospital: Hospital = Depends(get_current_hospital),
):
    if update.blood_type not in BLOOD_TYPES:
        raise HTTPException(status_code=400, detail="Unknown blood type")
    if update.units_available < 0:
        raise HTTPException(status_code=400, detail="Units available cannot be negative")

    row = (
        db.query(BloodInventory)
        .filter(BloodInventory.hospital_id == current_hospital.id, BloodInventory.blood_type == update.blood_type)
        .first()
    )
    if not row:
        row = BloodInventory(hospital_id=current_hospital.id, blood_type=update.blood_type)
        db.add(row)

    row.units_available = update.units_available
    row.low_stock_threshold = update.low_stock_threshold
    db.commit()
    db.refresh(row)
    return _to_item_out(row)


@router.get("", response_model=List[HospitalInventoryOut])
def list_all_hospital_inventories(db: Session = Depends(get_db)):
    """Public view so donors and patients can see which nearby hospitals already have stock."""
    hospitals = db.query(Hospital).all()
    results = []
    for hospital in hospitals:
        rows = db.query(BloodInventory).filter(BloodInventory.hospital_id == hospital.id).all()
        if not rows:
            continue
        results.append(HospitalInventoryOut(
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            items=[_to_item_out(r) for r in sorted(rows, key=lambda r: BLOOD_TYPES.index(r.blood_type))],
        ))
    return results

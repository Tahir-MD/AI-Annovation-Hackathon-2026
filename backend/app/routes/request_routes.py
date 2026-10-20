from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.request import BloodRequest
from app.schemas.request_schema import BloodRequestCreate, BloodRequestOut
from app.utils.dependencies import get_current_hospital, get_current_receiver
from app.utils.notify import notify
from app.services.matching_service import find_matching_donors, find_hospitals_with_stock
from app.services.audit_service import record_event

router = APIRouter(prefix="/requests", tags=["Blood Requests"])


def _try_fulfill_from_hospital_stock(db: Session, blood_request: BloodRequest, requester_name: str) -> None:
    """
    Before a single donor is ever contacted, every new request is checked
    against hospital blood-bank inventory. A hospital's own shelf is
    checked first, then the stock of other nearby hospitals. Whatever can
    be covered from existing stock is deducted immediately; only a
    genuine shortfall is ever broadcast to donors.
    """
    still_needed = blood_request.units_needed - blood_request.units_fulfilled
    if still_needed <= 0:
        return

    prefer_hospital_id = blood_request.requester_id if blood_request.requester_type == "hospital" else None
    candidates = find_hospitals_with_stock(db, blood_request, prefer_hospital_id=prefer_hospital_id)

    for distance, hospital, inventory_row in candidates:
        if still_needed <= 0:
            break
        take = min(inventory_row.units_available, still_needed)
        if take <= 0:
            continue

        inventory_row.units_available -= take
        blood_request.units_fulfilled += take
        blood_request.inventory_units_used = (blood_request.inventory_units_used or 0) + take
        blood_request.fulfilled_from_inventory = True
        if blood_request.fulfilling_hospital_id is None:
            blood_request.fulfilling_hospital_id = hospital.id
        still_needed -= take

        is_own_stock = hospital.id == blood_request.requester_id and blood_request.requester_type == "hospital"
        notify(
            db, "hospital", hospital.id,
            "Blood issued from your inventory" if is_own_stock else "Your stock helped another request",
            f"{take} bag(s) of {blood_request.blood_type_needed} were allocated from your blood bank "
            f"to cover {requester_name}'s request." if not is_own_stock else
            f"{take} bag(s) of {blood_request.blood_type_needed} were used from your own stock for this request, "
            f"before any donor was contacted.",
            category="inventory",
            related_request_id=blood_request.id,
        )
        record_event(
            db, "inventory_used_for_request", actor_type="hospital", actor_id=hospital.id,
            payload={"request_id": blood_request.id, "blood_type": blood_request.blood_type_needed, "units": take},
        )

    if blood_request.units_fulfilled >= blood_request.units_needed:
        blood_request.status = "fulfilled"

    if blood_request.inventory_units_used:
        remaining = blood_request.units_needed - blood_request.units_fulfilled
        summary = (
            f"Good news — {blood_request.inventory_units_used} bag(s) of {blood_request.blood_type_needed} "
            f"were available immediately from hospital blood-bank stock."
        )
        if remaining > 0:
            summary += f" We are now contacting donors for the remaining {remaining} bag(s)."
        else:
            summary += " Your request is fully covered, no donor is needed."
        notify(
            db, blood_request.requester_type, blood_request.requester_id,
            "Hospital stock checked for your request", summary,
            category="request", related_request_id=blood_request.id,
        )

    db.commit()


def build_request_out(db: Session, blood_request: BloodRequest) -> BloodRequestOut:
    """
    Fills in who is asking. A hospital request shows the hospital name
    and phone number. A receiver request additionally shows the CNIC
    number and address of the person asking, since they are an
    individual rather than a licensed institution.
    """
    requester_cnic = None
    requester_address = None

    if blood_request.requester_type == "hospital":
        hospital = db.query(Hospital).filter(Hospital.id == blood_request.requester_id).first()
        requester_name = hospital.name if hospital else "Unknown hospital"
        requester_phone = hospital.phone_number if hospital else ""
    else:
        receiver = db.query(Receiver).filter(Receiver.id == blood_request.requester_id).first()
        requester_name = receiver.full_name if receiver else "Unknown receiver"
        requester_phone = receiver.phone_number if receiver else ""
        requester_cnic = receiver.cnic_number if receiver else None
        requester_address = receiver.address if receiver else None

    fulfilling_hospital_name = None
    if blood_request.fulfilling_hospital_id:
        fulfilling_hospital = db.query(Hospital).filter(Hospital.id == blood_request.fulfilling_hospital_id).first()
        fulfilling_hospital_name = fulfilling_hospital.name if fulfilling_hospital else None

    return BloodRequestOut(
        id=blood_request.id,
        requester_type=blood_request.requester_type,
        requester_id=blood_request.requester_id,
        requester_name=requester_name,
        requester_phone=requester_phone,
        requester_cnic=requester_cnic,
        requester_address=requester_address,
        blood_type_needed=blood_request.blood_type_needed,
        units_needed=blood_request.units_needed,
        units_fulfilled=blood_request.units_fulfilled,
        units_remaining=max(blood_request.units_needed - blood_request.units_fulfilled, 0),
        patient_name=blood_request.patient_name,
        patient_age=blood_request.patient_age,
        patient_gender=blood_request.patient_gender,
        medical_reason=blood_request.medical_reason,
        urgency_type=blood_request.urgency_type,
        urgency_value=blood_request.urgency_value,
        latitude=blood_request.latitude,
        longitude=blood_request.longitude,
        status=blood_request.status,
        created_at=blood_request.created_at,
        fulfilled_from_inventory=blood_request.fulfilled_from_inventory,
        inventory_units_used=blood_request.inventory_units_used or 0,
        fulfilling_hospital_name=fulfilling_hospital_name,
    )


@router.post("/hospital", response_model=BloodRequestOut, status_code=201)
def create_hospital_request(
    request_data: BloodRequestCreate,
    db: Session = Depends(get_db),
    current_hospital: Hospital = Depends(get_current_hospital),
):
    new_request = BloodRequest(
        requester_type="hospital",
        requester_id=current_hospital.id,
        blood_type_needed=request_data.blood_type_needed,
        units_needed=request_data.units_needed,
        patient_name=request_data.patient_name,
        patient_age=request_data.patient_age,
        patient_gender=request_data.patient_gender,
        medical_reason=request_data.medical_reason,
        urgency_type=request_data.urgency_type,
        urgency_value=request_data.urgency_value,
        latitude=request_data.latitude,
        longitude=request_data.longitude,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    record_event(
        db, "request_created", actor_type="hospital", actor_id=current_hospital.id,
        payload={"request_id": new_request.id, "blood_type": new_request.blood_type_needed, "units_needed": new_request.units_needed},
    )

    # Step 1: always check hospital blood-bank stock (this hospital first, then others nearby).
    _try_fulfill_from_hospital_stock(db, new_request, current_hospital.name)
    # Step 2: only the remaining shortfall, if any, goes out to donors.
    _notify_matching_donors(db, new_request, current_hospital.name)
    return build_request_out(db, new_request)


def _notify_matching_donors(db, blood_request: BloodRequest, requester_name: str) -> None:
    """Tells every compatible nearby donor about the shortfall left after checking hospital stock."""
    units_remaining = blood_request.units_needed - blood_request.units_fulfilled
    if units_remaining <= 0:
        return
    urgency_label = "an emergency" if blood_request.urgency_type == "emergency" else "a scheduled"
    for match in find_matching_donors(db, blood_request):
        notify(
            db, "donor", match.donor_id,
            "New compatible blood request nearby",
            f"{requester_name} needs {units_remaining} bag(s) of {blood_request.blood_type_needed} "
            f"({urgency_label} request), about {match.distance_kilometers} km away.",
            category="request",
            related_request_id=blood_request.id,
        )
    db.commit()


@router.post("/receiver", response_model=BloodRequestOut, status_code=201)
def create_receiver_request(
    request_data: BloodRequestCreate,
    db: Session = Depends(get_db),
    current_receiver: Receiver = Depends(get_current_receiver),
):
    new_request = BloodRequest(
        requester_type="receiver",
        requester_id=current_receiver.id,
        blood_type_needed=request_data.blood_type_needed,
        units_needed=request_data.units_needed,
        patient_name=request_data.patient_name or current_receiver.patient_name,
        patient_age=request_data.patient_age,
        patient_gender=request_data.patient_gender,
        medical_reason=request_data.medical_reason,
        urgency_type=request_data.urgency_type,
        urgency_value=request_data.urgency_value,
        latitude=request_data.latitude,
        longitude=request_data.longitude,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    record_event(
        db, "request_created", actor_type="receiver", actor_id=current_receiver.id,
        payload={"request_id": new_request.id, "blood_type": new_request.blood_type_needed, "units_needed": new_request.units_needed},
    )

    # Step 1: a patient's request also checks nearby hospitals' blood banks first.
    _try_fulfill_from_hospital_stock(db, new_request, current_receiver.full_name)
    # Step 2: only the remaining shortfall, if any, goes out to donors.
    _notify_matching_donors(db, new_request, current_receiver.full_name)
    return build_request_out(db, new_request)


@router.get("", response_model=list[BloodRequestOut])
def list_blood_requests(db: Session = Depends(get_db)):
    requests = db.query(BloodRequest).order_by(BloodRequest.created_at.desc()).all()
    return [build_request_out(db, item) for item in requests]


@router.get("/hospital/history", response_model=list[BloodRequestOut])
def hospital_request_history(
    db: Session = Depends(get_db),
    current_hospital: Hospital = Depends(get_current_hospital),
):
    """
    Every request this hospital has ever sent -- open, closed, or
    still waiting for a donor -- not just the ones a donor has
    fulfilled. This is the hospital's full request history, and it
    stays the same across logins because it is read straight from the
    database by this hospital's id.
    """
    requests = (
        db.query(BloodRequest)
        .filter(BloodRequest.requester_type == "hospital", BloodRequest.requester_id == current_hospital.id)
        .order_by(BloodRequest.created_at.desc())
        .all()
    )
    return [build_request_out(db, item) for item in requests]


@router.get("/receiver/history", response_model=list[BloodRequestOut])
def receiver_request_history(
    db: Session = Depends(get_db),
    current_receiver: Receiver = Depends(get_current_receiver),
):
    """Every request this patient has ever sent -- open, closed, or still waiting."""
    requests = (
        db.query(BloodRequest)
        .filter(BloodRequest.requester_type == "receiver", BloodRequest.requester_id == current_receiver.id)
        .order_by(BloodRequest.created_at.desc())
        .all()
    )
    return [build_request_out(db, item) for item in requests]


@router.get("/{request_id}", response_model=BloodRequestOut)
def get_blood_request(request_id: int, db: Session = Depends(get_db)):
    blood_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return build_request_out(db, blood_request)

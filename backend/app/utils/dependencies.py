from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.admin import Admin
from app.models.staff import Staff
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login/donor")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not verify the login token",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_donor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Donor:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "donor":
        raise CREDENTIALS_ERROR

    donor = db.query(Donor).filter(Donor.id == int(payload.get("sub"))).first()
    if not donor:
        raise CREDENTIALS_ERROR
    return donor


def get_current_hospital(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Hospital:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "hospital" or payload.get("stage") == "2fa_pending":
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR

    hospital = db.query(Hospital).filter(Hospital.id == int(payload.get("sub"))).first()
    if not hospital:
        raise CREDENTIALS_ERROR
    return hospital


def get_current_receiver(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Receiver:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "receiver":
        raise CREDENTIALS_ERROR

    receiver = db.query(Receiver).filter(Receiver.id == int(payload.get("sub"))).first()
    if not receiver:
        raise CREDENTIALS_ERROR
    return receiver


def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Admin:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "admin" or payload.get("stage") == "2fa_pending":
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR

    admin = db.query(Admin).filter(Admin.id == int(payload.get("sub"))).first()
    if not admin:
        raise CREDENTIALS_ERROR
    return admin


def get_current_staff(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Staff:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "staff":
        raise CREDENTIALS_ERROR

    staff = db.query(Staff).filter(Staff.id == int(payload.get("sub"))).first()
    if not staff:
        raise CREDENTIALS_ERROR
    return staff


def get_current_requester(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    A request for blood can come from either a hospital or a patient
    (receiver), so some endpoints - like rating the donor who helped
    you - need to accept whichever of the two is logged in.
    Returns a tuple of ("hospital" | "receiver", the account object).
    """
    payload = decode_access_token(token)
    if not payload or payload.get("role") not in ("hospital", "receiver") or payload.get("stage") == "2fa_pending":
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR

    role = payload.get("role")
    account_id = int(payload.get("sub"))
    if role == "hospital":
        account = db.query(Hospital).filter(Hospital.id == account_id).first()
    else:
        account = db.query(Receiver).filter(Receiver.id == account_id).first()

    if not account:
        raise CREDENTIALS_ERROR
    return role, account


def get_current_any_account(token: str = Depends(oauth2_scheme)):
    """
    For endpoints -- like push-notification subscribe/unsubscribe --
    that any logged-in account can use, whichever of the five roles
    they are. Only decodes the token; it does not touch the database,
    so it works even for roles this file doesn't import a model for.
    Returns a tuple of (role, account_id).
    """
    payload = decode_access_token(token)
    if not payload or payload.get("role") not in ("donor", "hospital", "receiver", "staff", "admin") or payload.get("stage") == "2fa_pending":
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR
    return payload.get("role"), int(payload.get("sub"))

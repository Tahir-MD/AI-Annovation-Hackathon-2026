from sqlalchemy.orm import Session

from app.models.notification import Notification


def notify(db: Session, user_type: str, user_id: int, title: str, message: str,
           category: str = "general", related_request_id: int = None) -> None:
    """
    Creates an in-app notification, and -- wherever a provider is
    configured -- also fans it out to real SMS (Twilio), real email
    (SendGrid), and real browser/PWA push (Web Push/VAPID). Every one
    of those three channels is optional and fails silently if not
    configured, so this function always at least creates the in-app
    notification.
    """
    notification = Notification(
        user_type=user_type,
        user_id=user_id,
        title=title,
        message=message,
        category=category,
        related_request_id=related_request_id,
    )
    db.add(notification)
    db.flush()

    _deliver_externally(db, user_type, user_id, title, message)


def _deliver_externally(db: Session, user_type: str, user_id: int, title: str, message: str) -> None:
    from app.services.delivery_service import is_sms_configured, is_email_configured, send_sms, send_email
    from app.services.push_service import is_push_configured, push_to_account

    if not (is_sms_configured() or is_email_configured() or is_push_configured()):
        return  # nothing configured -- skip the lookups below entirely

    phone_number, email = _contact_details(db, user_type, user_id)

    if is_sms_configured() and phone_number:
        send_sms(phone_number, f"{title}: {message}")
    if is_email_configured() and email:
        send_email(email, f"LifeFlow -- {title}", message)
    if is_push_configured():
        push_to_account(db, user_type, user_id, title, message)


def _contact_details(db: Session, user_type: str, user_id: int):
    """Looks up the phone number and email for whichever kind of account this notification is for."""
    if user_type == "donor":
        from app.models.donor import Donor
        account = db.query(Donor).filter(Donor.id == user_id).first()
    elif user_type == "hospital":
        from app.models.hospital import Hospital
        account = db.query(Hospital).filter(Hospital.id == user_id).first()
    elif user_type == "receiver":
        from app.models.receiver import Receiver
        account = db.query(Receiver).filter(Receiver.id == user_id).first()
    elif user_type == "staff":
        from app.models.staff import Staff
        account = db.query(Staff).filter(Staff.id == user_id).first()
    else:
        account = None

    if not account:
        return None, None
    phone_number = getattr(account, "phone_number", None)
    email = getattr(account, "email", None)
    return phone_number, email

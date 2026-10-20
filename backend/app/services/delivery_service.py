"""
Real SMS and email delivery, through Twilio and SendGrid.

Exactly like app/services/ai_client.py, this is a thin wrapper that is
completely optional: if the provider's environment variables aren't
set, every function here simply returns False and does nothing, so the
rest of the app (in-app notifications, the demo, the hackathon judges'
wifi) never depends on having real provider accounts configured.

To turn these on in a real deployment:

    export TWILIO_ACCOUNT_SID="AC..."
    export TWILIO_AUTH_TOKEN="..."
    export TWILIO_FROM_NUMBER="+15551234567"

    export SENDGRID_API_KEY="SG...."
    export SENDGRID_FROM_EMAIL="alerts@yourdomain.com"
"""
import os

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "alerts@lifeflow.app")


def is_sms_configured() -> bool:
    return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER)


def is_email_configured() -> bool:
    return bool(SENDGRID_API_KEY)


def send_sms(to_phone_number: str, message: str) -> bool:
    """Sends one SMS through Twilio. Returns False (never raises) if not configured or it fails."""
    if not is_sms_configured() or not to_phone_number:
        return False
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(body=message, from_=TWILIO_FROM_NUMBER, to=to_phone_number)
        return True
    except Exception:  # noqa: BLE001 -- delivery failures must never break the request that triggered them
        return False


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Sends one email through the SendGrid HTTP API. Returns False (never raises) if not configured or it fails."""
    if not is_email_configured() or not to_email:
        return False
    try:
        import requests
        response = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": SENDGRID_FROM_EMAIL},
                "subject": subject,
                "content": [{"type": "text/plain", "value": body}],
            },
            timeout=8,
        )
        return response.status_code < 300
    except Exception:  # noqa: BLE001
        return False


def delivery_status() -> dict:
    return {"sms_configured": is_sms_configured(), "email_configured": is_email_configured()}

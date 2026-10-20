from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app.models import (  # noqa: F401
    donor,
    hospital,
    receiver,
    request,
    donation,
    notification,
    rating,
    inventory,
    camp,
    admin,
    staff,
    visitor_log,
    audit_log,
    push_subscription,
)
from app.routes import (
    auth_routes,
    donor_routes,
    hospital_routes,
    receiver_routes,
    request_routes,
    matching_routes,
    donation_routes,
    notification_routes,
    rating_routes,
    inventory_routes,
    camp_routes,
    stats_routes,
    admin_routes,
    staff_routes,
    ai_routes,
    push_routes,
    ai_extra_routes,
    interop_routes,
    two_factor_routes,
)
from app.utils.security import hash_password

DEFAULT_ADMIN_EMAIL = "admin@lifeflow.com"
DEFAULT_ADMIN_PASSWORD = "Admin@123"

Base.metadata.create_all(bind=engine)


def _seed_default_admin() -> None:
    """
    Makes sure the one LifeFlow admin account always exists, so admin
    login works right away without a separate registration step.
    Change DEFAULT_ADMIN_PASSWORD (or set it via an environment
    variable in a real deployment) before going live.
    """
    db = SessionLocal()
    try:
        existing = db.query(admin.Admin).filter(admin.Admin.email == DEFAULT_ADMIN_EMAIL).first()
        if not existing:
            db.add(admin.Admin(
                full_name="LifeFlow Admin",
                email=DEFAULT_ADMIN_EMAIL,
                hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            ))
            db.commit()
    finally:
        db.close()


_seed_default_admin()

app = FastAPI(
    title="LifeFlow",
    description="A platform that connects blood donors, receivers, and hospitals.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(donor_routes.router)
app.include_router(hospital_routes.router)
app.include_router(receiver_routes.router)
app.include_router(request_routes.router)
app.include_router(matching_routes.router)
app.include_router(donation_routes.router)
app.include_router(notification_routes.router)
app.include_router(rating_routes.router)
app.include_router(inventory_routes.router)
app.include_router(camp_routes.router)
app.include_router(stats_routes.router)
app.include_router(admin_routes.router)
app.include_router(staff_routes.router)
app.include_router(ai_routes.router)
app.include_router(push_routes.router)
app.include_router(ai_extra_routes.router)
app.include_router(interop_routes.router)
app.include_router(two_factor_routes.router)


@app.get("/")
def read_root():
    return {"message": "The LifeFlow backend is running."}

from datetime import datetime, timedelta
from typing import Optional

MINIMUM_DAYS_BETWEEN_DONATIONS = 90

# Ordered from highest to lowest so the first match wins.
BADGE_TIERS = [
    (20, "Platinum Lifesaver"),
    (10, "Gold Lifesaver"),
    (5, "Silver Lifesaver"),
    (1, "Bronze Lifesaver"),
    (0, "New Donor"),
]


def get_badge_tier(total_donations: int) -> str:
    for threshold, label in BADGE_TIERS:
        if total_donations >= threshold:
            return label
    return "New Donor"


def get_next_eligible_date(last_donation_date: Optional[datetime]) -> Optional[datetime]:
    if not last_donation_date:
        return None
    next_date = last_donation_date + timedelta(days=MINIMUM_DAYS_BETWEEN_DONATIONS)
    return next_date if next_date > datetime.utcnow() else None


def is_eligible_now(is_eligible_flag: bool, last_donation_date: Optional[datetime]) -> bool:
    if not is_eligible_flag:
        return False
    return get_next_eligible_date(last_donation_date) is None

# LifeFlow

## Streamlit deployment (quick start)

`streamlit_app.py` is a complete Streamlit front end. It runs the FastAPI backend in the
same process, so no separate server is needed.

Run locally:

    pip install -r requirements.txt
    streamlit run streamlit_app.py

Deploy on Streamlit Community Cloud:

1. Push this folder to GitHub (`streamlit_app.py` and `requirements.txt` must be at the repo root).
2. share.streamlit.io -> Create app -> main file `streamlit_app.py`.
3. Advanced settings -> Secrets (see `.streamlit/secrets.toml.example`):

       LIFEFLOW_SECRET_KEY = "a-long-random-string"
       GROQ_API_KEY = "gsk_..."      # needed for the AI features (free key at console.groq.com)

4. First admin login: admin@lifeflow.com / Admin@123 -> you must set your own email and password.

Notes:
- A floating 🤖 assistant button (bottom-right) is available on every page: Home and all five dashboards.
- Without `GROQ_API_KEY` the AI request reader, voice input, assistants, document check and
  AI commentary show a "not configured" message; rule-based features (matching, stock-first,
  forecast numbers, allocation, audit chain) still work.
- Streamlit Cloud's disk is temporary: SQLite data resets on restart. For permanent data use a free
  Postgres (Neon / Supabase): add `psycopg2-binary` to requirements.txt and set `LIFEFLOW_DATABASE_URL`.
- SMS / email need Twilio / SendGrid keys (optional). Browser push is not used in the Streamlit version.
- The original React frontend is still in `frontend/` and the backend still runs alone with
  `uvicorn app.main:app` (use `backend/requirements.txt`).

---


LifeFlow connects blood donors with hospitals and with individual
patients who need blood directly. This project has two parts: a
backend that handles data and matching, and a frontend that people
use in the browser.

## Running the backend

1. Open a terminal and go into the backend folder.
   cd backend

2. Create a virtual environment and turn it on.
   python -m venv venv
   On Windows: venv\Scripts\activate
   On Mac or Linux: source venv/bin/activate

3. Install the required packages.
   pip install -r requirements.txt

4. Start the server.
   uvicorn app.main:app --reload

5. The backend is now running at
   http://127.0.0.1:8000

   You can view the automatic documentation and try every route at
   http://127.0.0.1:8000/docs

A file named lifeflow.db will be created automatically the first time
you run it. This is the database, and it needs no separate setup.

## Running the frontend

1. Open a second terminal and go into the frontend folder.
   cd frontend

2. Install the required packages.
   npm install

3. Start the development server.
   npm run dev

4. Open the address shown in the terminal, usually
   http://127.0.0.1:5173

The frontend expects the backend to be running at
http://127.0.0.1:8000

If you started the backend on a different port, open
frontend/src/services/api.js and change the BASE_URL value to match.

## The three kinds of accounts

Donor, a person who can give blood. Signs up with a blood type,
phone number, and location.

Patient, called a receiver in the code, a person who needs blood
directly for themselves or a family member, without going through a
hospital. Signs up with a phone number, CNIC number, and address, so
a donor can see exactly who they would be helping.

Hospital, a licensed institution. Signs up with a license number and
phone number.

## The admin account

There is also one built-in Admin account, used to see every donor,
hospital, and patient's full history in one place -- every request
(open, closed, or still waiting), every completed donation, and
every message/request notification ever sent, across all of them.

It is created automatically the first time the backend starts, with:

    email:    admin@lifeflow.com
    password: Admin@123

Log in at /admin/login on the frontend. Change
DEFAULT_ADMIN_PASSWORD in backend/app/main.py (or seed a different
one) before putting this online for real.

## Pop-up requests and full history

Every donor, hospital, and patient sees a notification bell in the
top bar, and a live pop-up appears the moment a new request or
message comes in, without needing to refresh. All of this -- and
every donation and request -- is saved permanently in the database
per account, so it is never lost: logging out and back in, even the
next day, shows exactly the same history, and it never mixes
between different users signed in on the same device.

## Hospital staff and shifts

A hospital can create a login for each staff member from its
dashboard ("Staff & shifts" tab), assigning them to one of four
fixed shifts: Shift 1, Shift 2, Shift 3, Shift 4. The hospital hands
that email and password to whoever is coming on duty.

Each staff member logs in separately, at /staff/login, and records
every donor or patient they attend to during their shift (name,
blood type, phone number, where they came from, and notes). This
builds up that staff member's own shift record, completely separate
from every other staff member's -- so at the end of their duty they
can review exactly how many donors and patients they saw, and print
or save it as a PDF (see below). The hospital can see the combined
record from every staff member and shift together, and the admin can
see every hospital's staff and every one of their shift records too.

## Saving and printing any history as a PDF

Every history view across the site -- a donor's donations, a
hospital's or patient's requests, a staff member's shift record, and
every admin view -- has a "Print / Save as PDF" button. It opens the
browser's normal print dialog; choosing "Save as PDF" there saves
that exact record as a PDF file, or it can be sent straight to a
printer. No extra software is needed.

## Trying it out

1. Open the frontend in the browser.
2. Sign up as a donor with a blood type, phone number, and location.
3. Sign up as a patient, or as a hospital, whichever you want to try.
4. Log in as the patient or hospital and create a request, choosing
   how many bags are needed and how soon, either an emergency, a
   number of days, or a number of months.
5. You will see the list of matching donors, ranked by distance,
   each with a phone number.
6. Log in as the donor and see the open request, showing the
   requester's name, phone number, and, for a patient request, their
   CNIC number and address.
7. Choose how many bags you can give and accept. If the request
   needed more bags than you gave, it stays open for another donor
   to cover the rest. Once every bag is covered, the request closes
   and disappears from the open list.

## Project layout

backend, the Python server built with FastAPI. Handles sign up,
login, requests, and the matching logic for all three account types.

frontend, the React website. Lets donors, patients, and hospitals
sign up, log in, create requests, and see matches.

## What is included in this version

Sign up and login for donors, patients, and hospitals, with secure
passwords and login tokens. Emergency and scheduled blood requests,
in bags, with an urgency timeframe. Matching by blood type
compatibility, distance, and eligibility, with contact numbers shown
on both sides. A request can be filled by more than one donor if
no single donor covers every bag needed. Points for donors based on
how many bags they give.

On top of that original core, this version adds:

- **Full donation history on every dashboard.** A donor sees every
  bag they gave and exactly who received it (hospital or patient,
  with phone number, and CNIC and address for a patient). A hospital
  or patient sees every donation they received, with the donor's
  full name, blood type, phone number, and the date and time.
- **In-app notifications.** Every account has a notification bell.
  Donors are notified the moment a compatible request opens nearby;
  hospitals and patients are notified the moment a donor accepts;
  everyone is notified about new donation camps. This stands in for
  the SMS/email/push alerts a production deployment would send
  through a provider such as Twilio or SendGrid.
- **Two-way ratings.** After a donation, the requester can rate the
  donor and the donor can rate the requester, building a visible
  reputation for both sides.
- **Donor badges, points, and a public leaderboard.** Donors earn a
  tier (Bronze through Platinum Lifesaver) based on total donations,
  and can see their community rank.
- **Hospital blood bank inventory.** Hospitals track how many bags of
  each blood type they currently hold, with a low stock warning.
- **Donation camps / blood drives.** Hospitals can organize and
  publish a camp; donors are notified and can register; hospitals see
  the full list of registered donors with contact details.
- **Per-role stats dashboards.** Donors see total donations, bags
  given, estimated lives impacted, and next eligible donation date.
  Hospitals and patients see total, open, and fulfilled requests and
  total bags received.

## What is not included yet

Real SMS/email delivery (Twilio, SendGrid, or similar), push
notifications to a mobile app, offline mode, shortage prediction,
permanent tamper proof records, multi-language support, and a formal
admin/verification panel for licensing hospitals and confirming
donor eligibility with a medical provider. A production deployment
would also replace SQLite with PostgreSQL and add Alembic migrations
before the schema changes in this version, since `Base.metadata.create_all`
only creates tables that do not exist yet - if you already have a
`lifeflow.db` from an earlier version, delete it before running this
one so the new tables and columns are created fresh.

## AI setup (Groq)

```
cd backend
export GROQ_API_KEY="gsk_..."      # free key: https://console.groq.com/keys
pip install -r requirements.txt
rm -f lifeflow.db                   # only if upgrading from an older version (new columns/tables)
uvicorn app.main:app --reload
```

Default admin: `admin@lifeflow.com` / `Admin@123` — you are forced to change it on first login.
For PostgreSQL: set `LIFEFLOW_DATABASE_URL`, then `alembic upgrade head`.
See `backend/.env.example` for all optional settings (SMS, email, push).

## Newest features (voice intake, explainable matching, sentiment flagging, re-engagement, camp suggestions, donor ID card, 2FA, reporting export)

No new pip packages are required for any of this -- 2FA uses a small stdlib-only TOTP
implementation (`backend/app/utils/totp.py`), and everything else reuses the existing
Groq/`requests` setup.

- **Voice request intake**: a 🎤 button next to the AI "describe your need" box on the
  Hospital and Patient dashboards, using Groq's hosted Whisper model.
- **"Why this donor?"**: every ranked donor match now includes a short, explainable
  reason line (distance, rating, donation history, reliability) built from the same
  numbers behind the ranking -- not a separate AI call per donor.
- **Sentiment analysis on ratings**: a rating comment is classified positive/neutral/negative
  when submitted (AI if configured, keyword fallback otherwise); negative ones are flagged
  and surfaced to admins under Admin → "Verification, audit & AI" → Flagged ratings.
- **Donor re-engagement**: same admin tab lists overdue/never-donated donors for blood
  types currently running short, drafts a personalized AI message per donor, and sends
  it through every configured channel (in-app, SMS, email, push) after you review it.
- **AI camp-location suggestions**: same tab, clusters recent request demand on a simple
  grid and suggests where to plan the next donation camp.
- **Digital donor card**: Donor dashboard → Stats tab. Blood type, donation count, and a
  scannable QR code; printable/saveable as PDF with the existing print button.
- **Two-factor authentication**: Hospital dashboard → AI tools tab, and Admin →
  governance tab. TOTP-based (Google Authenticator, Authy, etc.); once turned on, login
  requires a second 6-digit-code step.
- **Reporting export**: Admin governance tab -- a by-blood-type summary, viewable on
  screen or downloaded as CSV, for handing to a health authority.

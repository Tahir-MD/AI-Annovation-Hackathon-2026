"""
LifeFlow - Streamlit front end (v2).

The FastAPI backend in backend/app is reused unchanged and runs *inside*
this Streamlit process through FastAPI's TestClient, so the whole product
deploys as a single Streamlit app (no separate server, no ports).
"""
import io
import os
import sys
import tempfile
from datetime import datetime, time as dtime, timedelta
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).parent.resolve()
sys.path.insert(0, str(ROOT / "backend"))

# ---- Secrets -> environment (before the backend is imported) -----------------
for _k in ("LIFEFLOW_SECRET_KEY", "LIFEFLOW_DATABASE_URL", "GROQ_API_KEY", "LIFEFLOW_AI_MODEL",
           "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER",
           "SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"):
    try:
        if _k in st.secrets:
            os.environ[_k] = str(st.secrets[_k])
    except Exception:
        pass


def _default_db_url():
    for base in (ROOT, Path(tempfile.gettempdir())):
        try:
            probe = base / ".write_test"
            probe.write_text("ok")
            probe.unlink()
            return f"sqlite:///{base / 'lifeflow.db'}"
        except Exception:
            continue
    return "sqlite:///:memory:"


os.environ.setdefault("LIFEFLOW_DATABASE_URL", _default_db_url())

st.set_page_config(page_title="LifeFlow", page_icon="🩸", layout="wide")

BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
SHIFTS = ["Shift 1", "Shift 2", "Shift 3", "Shift 4"]


@st.cache_resource(show_spinner="Starting LifeFlow...")
def get_client():
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


client = get_client()


# ------------------------------------------------------------------ helpers
def api(method, path, token=None, json=None, params=None, files=None, data=None, quiet=False, raw=False):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        r = client.request(method, path, headers=headers, json=json, params=params, files=files, data=data)
    except Exception as exc:  # pragma: no cover
        if not quiet:
            st.error(f"Request failed: {exc}")
        return None
    if r.status_code >= 400:
        if not quiet:
            try:
                detail = r.json().get("detail")
            except Exception:
                detail = r.text
            if isinstance(detail, list):
                detail = "; ".join(f"{'.'.join(map(str, d.get('loc', [])[1:]))}: {d.get('msg')}" for d in detail)
            st.error(str(detail))
        return None
    if raw:
        return r.content
    if r.status_code == 204 or not r.content:
        return True
    return r.json()


def S():
    return st.session_state


def init_state():
    for k, v in (("role", None), ("token", None), ("chat", {}), ("pending_2fa", None),
                 ("prefill", {}), ("pf_ver", 0), ("last_request", None)):
        S().setdefault(k, v)


def logout():
    for k in list(S().keys()):
        del S()[k]
    init_state()
    st.rerun()


def fmt_dt(v):
    try:
        return datetime.fromisoformat(str(v).replace("Z", "")).strftime("%d %b %Y, %H:%M")
    except Exception:
        return str(v)


def show_table(rows, columns=None, rename=None, key="t"):
    if not rows:
        st.info("Nothing here yet.")
        return
    df = pd.DataFrame(rows)
    for c in df.columns:
        if "date" in c or c.endswith("_at"):
            df[c] = df[c].map(lambda x: fmt_dt(x) if x else "")
    if columns:
        df = df[[c for c in columns if c in df.columns]]
    if rename:
        df = df.rename(columns=rename)
    st.dataframe(df, width="stretch", hide_index=True)
    st.download_button("⬇️ CSV", df.to_csv(index=False).encode(), file_name=f"lifeflow_{key}.csv",
                       mime="text/csv", key=f"dl_{key}")


def qr_image(text):
    """QR code generated locally (nothing is sent to a third-party service)."""
    try:
        import qrcode
        buf = io.BytesIO()
        qrcode.make(text).save(buf, format="PNG")
        return buf.getvalue()
    except Exception:
        return None


def bump_prefill(values):
    S().prefill = values
    S().pf_ver += 1


# ------------------------------------------------------------- shared pieces
def platform_stats():
    d = api("GET", "/stats/platform", quiet=True)
    if not d:
        return
    c = st.columns(6)
    c[0].metric("Donors", d["total_donors"])
    c[1].metric("Hospitals", d["total_hospitals"])
    c[2].metric("Patients helped", d["total_patients_helped"])
    c[3].metric("Bags donated", d["total_units_donated"])
    c[4].metric("Requests fulfilled", d["total_requests_fulfilled"])
    c[5].metric("Avg rating", d["average_platform_rating"] or "-")


def leaderboard_view():
    rows = api("GET", "/leaderboard/donors", quiet=True) or []
    show_table(rows, ["rank", "full_name", "blood_type", "points", "total_donations", "badge_tier"],
               {"rank": "Rank", "full_name": "Donor", "blood_type": "Blood", "points": "Points",
                "total_donations": "Donations", "badge_tier": "Badge"}, key="leaderboard")


def inventory_public_view():
    data = api("GET", "/inventory", quiet=True) or []
    if not data:
        st.info("No hospital has published stock yet.")
    for h in data:
        with st.expander(f"🏥 {h['hospital_name']}"):
            cols = st.columns(8)
            for col, it in zip(cols, h["items"]):
                col.metric(it["blood_type"], it["units_available"], "LOW" if it["is_low"] else None,
                           delta_color="inverse")


def camps_public_view():
    camps = api("GET", "/camps", quiet=True) or []
    show_table(camps, ["title", "hospital_name", "location_label", "camp_date", "registered_count"],
               {"title": "Camp", "hospital_name": "Hospital", "location_label": "Location",
                "camp_date": "Date", "registered_count": "Registered"}, key="camps_public")


def assistant_chat(role, key):
    """Role-aware AI assistant (POST /ai/assistant/{role})."""
    hist = S().chat.setdefault(key, [])
    for m in hist:
        with st.chat_message(m["role"]):
            st.write(m["text"])
    msg = st.chat_input("Ask the LifeFlow assistant...", key=f"ci_{key}")
    if msg:
        hist.append({"role": "user", "text": msg})
        res = api("POST", f"/ai/assistant/{role}", S().token, json={"message": msg})
        hist.append({"role": "assistant", "text": res["reply"] if res else "Sorry, something went wrong."})
        st.rerun()


def ai_request_reader(key, show_hint=True):
    """Typed or spoken request -> structured fields (POST /ai/transcribe, /ai/parse-request)."""
    text = st.text_area("Describe the blood you need, in any language (English, Urdu, Roman Urdu...)",
                        height=90, key=f"{key}_text",
                        placeholder="e.g. 'Mujhe kal tak 2 bag B+ chahiye, patient Ali, surgery hai'")
    voice = None
    if hasattr(st, "audio_input"):
        voice = st.audio_input("...or record your voice", key=f"{key}_voice")
    c1, c2 = st.columns(2)
    go = c1.button("🤖 Read my request", key=f"{key}_go", type="primary")
    if go:
        spoken = None
        if voice is not None:
            res = api("POST", "/ai/transcribe", S().token,
                      files={"file": ("voice.wav", voice.getvalue(), "audio/wav")})
            spoken = res.get("transcript") if res else None
            if spoken:
                st.info(f"Heard: {spoken}")
        final = " ".join(x for x in (text.strip(), spoken or "") if x)
        if not final:
            st.warning("Type or record something first.")
            return
        res = api("POST", "/ai/parse-request", json={"text": final})
        if res and res.get("understood"):
            bump_prefill({k: res.get(k) for k in ("blood_type_needed", "units_needed", "patient_name", "patient_age",
                                                 "patient_gender", "medical_reason", "urgency_type", "urgency_value")})
            st.success(f"{res.get('note_to_user') or 'Understood.'} (language: {res.get('detected_language')}). "
                       "Please check the form below before sending.")
        elif res:
            st.warning(res.get("note_to_user") or "Could not understand. Please fill the form directly.")
    if show_hint and S().prefill:
        st.caption("Form below is pre-filled from your message. You always confirm before it is sent.")


def request_status_note(r):
    if r.get("fulfilled_from_inventory"):
        st.success(f"🏥 {r['inventory_units_used']} bag(s) were supplied from "
                   f"{r.get('fulfilling_hospital_name') or 'a hospital'}'s blood-bank stock "
                   "before any donor was contacted.")
    if r["units_remaining"] > 0:
        st.info(f"Still needed: {r['units_remaining']} bag(s). Matching donors have been alerted.")
    else:
        st.success("Request fully covered. No donor needed.")


def matches_view(request_id, role_token, key):
    matches = api("GET", f"/matching/{request_id}") or []
    rows = []
    for m in matches:
        rows.append({**m, "follow_through": f"{round((1 - (m.get('no_show_risk') or 0)) * 100)}%"})
    show_table(rows, ["full_name", "blood_type", "phone_number", "distance_kilometers", "match_score",
                      "follow_through", "match_reason"],
               {"full_name": "Donor", "blood_type": "Blood", "phone_number": "Phone",
                "distance_kilometers": "km", "match_score": "Score", "follow_through": "Likely to come",
                "match_reason": "Why this donor"}, key=f"matches_{key}")
    plan = api("GET", f"/ai/no-show-plan/{request_id}", role_token, quiet=True)
    if plan:
        st.markdown("**No-show planning**")
        c = st.columns(4)
        c[0].metric("Bags still needed", plan["units_still_needed"])
        c[1].metric("Donors available", plan["donors_available"])
        c[2].metric("Alert this many", plan["recommended_alert_count"])
        c[3].metric("Expected arrivals", plan["expected_arrivals"])
        if plan["shortfall_risk"]:
            st.warning("Not enough eligible donors to safely cover this request.")


def request_form(role, tok, lat0=31.5204, lon0=74.3587):
    pf = S().prefill or {}
    v = S().pf_ver
    bt = pf.get("blood_type_needed") if pf.get("blood_type_needed") in BLOOD_TYPES else "O+"
    ut = pf.get("urgency_type") if pf.get("urgency_type") in ("emergency", "days", "months") else "emergency"
    with st.form(f"new_request_{role}"):
        c1, c2 = st.columns(2)
        blood = c1.selectbox("Blood type needed", BLOOD_TYPES, index=BLOOD_TYPES.index(bt), key=f"rb_{v}")
        units = c2.number_input("Bags needed", 1, 20, int(pf.get("units_needed") or 1), key=f"ru_{v}")
        c3, c4, c5 = st.columns(3)
        patient = c3.text_input("Patient name", value=pf.get("patient_name") or "", key=f"rp_{v}")
        age = c4.number_input("Patient age (0 = unknown)", 0, 120, int(pf.get("patient_age") or 0), key=f"ra_{v}")
        gender = c5.selectbox("Gender", ["", "Male", "Female", "Other"],
                              index=["", "Male", "Female", "Other"].index(pf.get("patient_gender") or "")
                              if (pf.get("patient_gender") or "") in ["", "Male", "Female", "Other"] else 0,
                              key=f"rg_{v}")
        reason = st.text_input("Medical reason", value=pf.get("medical_reason") or "", key=f"rr_{v}")
        c6, c7 = st.columns(2)
        urg = c6.selectbox("How soon?", ["emergency", "days", "months"], index=["emergency", "days", "months"].index(ut),
                           key=f"rt_{v}")
        urg_v = c7.number_input("If days/months: how many?", 0, 365, int(pf.get("urgency_value") or 0), key=f"rv_{v}")
        c8, c9 = st.columns(2)
        lat = c8.number_input("Latitude", value=float(lat0), format="%.5f", key=f"rl_{v}")
        lon = c9.number_input("Longitude", value=float(lon0), format="%.5f", key=f"rn_{v}")
        go = st.form_submit_button("🩸 Confirm & create request", type="primary")
    if go:
        payload = {"blood_type_needed": blood, "units_needed": int(units), "patient_name": patient or None,
                   "patient_age": int(age) or None, "patient_gender": gender or None,
                   "medical_reason": reason or None, "urgency_type": urg,
                   "urgency_value": int(urg_v) if urg != "emergency" and urg_v else None,
                   "latitude": lat, "longitude": lon}
        res = api("POST", f"/requests/{role}", tok, json=payload)
        if res:
            S().prefill = {}
            S().last_request = res
    lr = S().last_request
    if lr:
        st.subheader(f"Request #{lr['id']}")
        fresh = api("GET", f"/requests/{lr['id']}", quiet=True) or lr
        request_status_note(fresh)
        if fresh["units_remaining"] > 0:
            matches_view(fresh["id"], tok, f"new{fresh['id']}")


def notifications_view(role, tok):
    items = api("GET", f"/notifications/{role}", tok) or []
    unread = sum(1 for n in items if not n["is_read"])
    st.write(f"**{unread} unread** of {len(items)}")
    if unread and st.button("Mark all as read", key=f"readall_{role}"):
        api("POST", f"/notifications/{role}/read-all", tok)
        st.rerun()
    for n in items[:60]:
        st.markdown(f"{'🔵' if not n['is_read'] else '⚪'} **{n['title']}** — {n['message']}  \n"
                    f"<small>{fmt_dt(n['created_at'])}</small>", unsafe_allow_html=True)


def my_requests_view(role, tok):
    rows = api("GET", f"/requests/{role}/history", tok) or []
    show_table(rows, ["id", "blood_type_needed", "units_needed", "units_fulfilled", "inventory_units_used", "status",
                      "urgency_type", "patient_name", "created_at"],
               {"id": "ID", "blood_type_needed": "Blood", "units_needed": "Needed", "units_fulfilled": "Covered",
                "inventory_units_used": "From stock", "status": "Status", "urgency_type": "Urgency",
                "patient_name": "Patient", "created_at": "Created"}, key=f"myreq_{role}")
    open_rows = [r for r in rows if r["status"] == "open"]
    if open_rows:
        pick = st.selectbox("See matching donors for an open request", [r["id"] for r in open_rows], key=f"mr_pick_{role}")
        matches_view(pick, tok, f"my{role}{pick}")


def donations_received_view(role, tok, my_id=None):
    if my_id:
        rep = api("GET", f"/ratings/requester/{role}/{my_id}", quiet=True)
        if rep:
            st.write("⭐ Your rating from donors: " + (f"{rep['average_stars']} ({rep['total_ratings']} rating(s))"
                                                      if rep["total_ratings"] else "none yet"))
    rows = api("GET", f"/donations/{role}/history", tok) or []
    show_table(rows, ["donation_id", "donor_name", "donor_blood_type", "donor_phone", "units_donated", "donated_at"],
               {"donation_id": "ID", "donor_name": "Donor", "donor_blood_type": "Blood", "donor_phone": "Phone",
                "units_donated": "Bags", "donated_at": "When"}, key=f"don_{role}")
    if rows:
        st.markdown("##### Rate a donor")
        opts = {f"#{r['donation_id']} — {r['donor_name']}": r["donation_id"] for r in rows}
        pick = st.selectbox("Donation", list(opts), key=f"rate_pick_{role}")
        stars = st.slider("Stars", 1, 5, 5, key=f"rate_stars_{role}")
        cm = st.text_input("Comment (optional)", key=f"rate_c_{role}")
        if st.button("Submit rating", key=f"rate_go_{role}"):
            if api("POST", f"/ratings/{opts[pick]}/rate-donor", tok, json={"stars": stars, "comment": cm or None}):
                st.success("Thanks for rating!")


def forecast_view(tok, platform=False):
    d = api("GET", "/ai/forecast/platform" if platform else "/ai/forecast/hospital", tok)
    if not d:
        return
    if d.get("summary"):
        st.warning(d["summary"])
    rows = d["entries"]
    icon = {"high": "🔴 High", "medium": "🟠 Medium", "low": "🟢 Low"}
    for r in rows:
        r["risk"] = icon.get(r["risk_level"], r["risk_level"])
    show_table(rows, ["blood_type", "current_stock", "average_daily_demand", "trend", "projected_demand_next_7_days",
                      "days_until_shortage", "risk"],
               {"blood_type": "Blood", "current_stock": "Stock", "average_daily_demand": "Avg/day",
                "trend": "Trend", "projected_demand_next_7_days": "Next 7 days", "days_until_shortage": "Days left",
                "risk": "Risk"}, key=f"forecast_{'p' if platform else 'h'}")
    with st.expander("How accurate is this forecast? (backtest)"):
        acc = api("GET", "/ai/forecast-accuracy", tok, quiet=True)
        if acc:
            c = st.columns(4)
            c[0].metric("Model error (bags/day)", acc["overall_model_mae"])
            c[1].metric("'Same as yesterday' error", acc["overall_naive_mae"])
            c[2].metric("Improvement", f"{acc['improvement_over_baseline_percent']}%"
                        if acc["improvement_over_baseline_percent"] is not None else "-")
            c[3].metric("Predictions scored", acc["predictions_scored"])
            show_table(acc["per_blood_type"], key="acc_types")
            st.caption(acc["note"])


def allocation_view(tok):
    d = api("GET", "/ai/allocation", tok)
    if not d:
        return
    c = st.columns(4)
    c[0].metric("Open requests", d["open_requests"])
    c[1].metric("Bags needed", d["units_needed"])
    c[2].metric("Bags covered by donors", d["units_covered"])
    c[3].metric("Coverage", f"{d['coverage_percent']}%")
    st.caption(d["method"])
    rows = [{"request": a["request_id"], "blood": a["blood_type"], "urgency": a["urgency"],
             "needed": a["units_needed"], "covered": a["units_covered"],
             "assigned donors": ", ".join(x["name"] for x in a["assigned_donors"]) or "-"} for a in d["assignments"]]
    show_table(rows, key="allocation")


def reengagement_view(tok):
    st.caption("Overdue (or never-donated) donors whose blood type is currently running low. "
               "You review the AI-written message before it is sent.")
    cands = api("GET", "/ai/re-engagement/candidates", tok) or []
    show_table(cands, ["full_name", "blood_type", "phone_number", "days_since_last_donation", "days_overdue",
                       "never_donated"], key="reeng")
    if cands:
        opts = {f"{c['full_name']} ({c['blood_type']})": c["donor_id"] for c in cands}
        pick = st.selectbox("Donor", list(opts), key="reeng_pick")
        if st.button("✍️ Draft message", key="reeng_draft"):
            d = api("GET", f"/ai/re-engagement/draft/{opts[pick]}", tok)
            if d:
                S()["reeng_msg"] = d["draft_message"]
        if S().get("reeng_msg"):
            msg = st.text_area("Review / edit the message", S()["reeng_msg"], key="reeng_edit")
            if st.button("📨 Send", key="reeng_send", type="primary"):
                if api("POST", "/ai/re-engagement/send", tok, json={"donor_id": opts[pick], "message": msg}):
                    st.success("Sent through every configured channel.")
                    S()["reeng_msg"] = None


def camp_suggestions_view(tok):
    d = api("GET", "/ai/camp-suggestions", tok)
    if not d:
        return
    if d.get("ai_commentary"):
        st.info(d["ai_commentary"])
    show_table(d["clusters"], ["approx_latitude", "approx_longitude", "request_count", "units_needed",
                               "most_needed_type"], key="camp_sugg")
    st.caption(f"Based on requests from the last {d['days_analyzed']} days, grouped into ~6 km map squares.")


def impact_view(tok):
    d = api("GET", "/ai/impact", tok)
    if not d:
        return
    c = st.columns(4)
    c[0].metric("Requests", d["total_requests"])
    c[1].metric("Helped by stock", d["requests_helped_by_stock"])
    c[2].metric("Bags from stock", d["units_supplied_from_stock"])
    c[3].metric("Bags from donors", d["units_donated_by_donors"])
    c = st.columns(2)
    c[0].metric("Donor calls avoided (estimate)", d["estimated_donor_callouts_avoided"])
    c[1].metric("Coordinator hours saved (estimate)", d["estimated_coordinator_hours_saved"])
    st.caption(d["assumptions"])


def two_factor_view(role, tok):
    st.caption("Add a second step to login using an authenticator app (Google Authenticator, Authy...).")
    s = api("GET", f"/2fa/{role}/status", tok, quiet=True)
    if s is None:
        return
    if s["two_factor_enabled"]:
        st.success("Two-step login is ON.")
        pw = st.text_input("Password (to turn it off)", type="password", key=f"2fa_off_pw_{role}")
        if st.button("Turn off", key=f"2fa_off_{role}"):
            if api("POST", f"/2fa/{role}/disable", tok, json={"password": pw}):
                st.rerun()
        return
    if st.button("Set up two-step login", key=f"2fa_setup_{role}"):
        d = api("POST", f"/2fa/{role}/setup", tok)
        if d:
            S()[f"2fa_{role}"] = d
    d = S().get(f"2fa_{role}")
    if d:
        img = qr_image(d["otpauth_uri"])
        if img:
            st.image(img, width=200, caption="Scan with your authenticator app")
        st.code(d["secret"], language=None)
        code = st.text_input("Enter the 6-digit code to confirm", key=f"2fa_code_{role}")
        if st.button("Turn on", key=f"2fa_on_{role}", type="primary"):
            if api("POST", f"/2fa/{role}/enable", tok, json={"code": code}):
                S()[f"2fa_{role}"] = None
                st.rerun()


def doc_check_widget(doc_type, claimed_label):
    with st.expander("🤖 Optional: AI document check (photo of your document)"):
        num = st.text_input(claimed_label, key=f"dc_num_{doc_type}")
        up = st.file_uploader("Photo (max 4 MB)", type=["jpg", "jpeg", "png"], key=f"dc_file_{doc_type}")
        if st.button("Check document", key=f"dc_go_{doc_type}") and up and num:
            r = api("POST", "/ai/verify-document", data={"doc_type": doc_type, "claimed_number": num},
                    files={"file": (up.name, up.getvalue(), up.type or "image/jpeg")})
            if r:
                (st.warning if r["needs_manual_review"] else st.success)(r["note"])


# ------------------------------------------------------------------- pages
def page_home():
    st.title("🩸 LifeFlow")
    st.caption("Check hospital stock first, then find the right donor fast.")
    platform_stats()
    t = st.tabs(["🤖 Ask LifeFlow", "🗣️ Try the AI request reader", "🏆 Leaderboard", "🏥 Blood stock", "📅 Camps"])
    with t[0]:
        assistant_chat("guest", "guest")
    with t[1]:
        st.write("Type or speak a blood request in any language. Log in as a patient or hospital to send it.")
        ai_request_reader("home_reader", show_hint=False)
        if S().prefill:
            st.json({k: v for k, v in S().prefill.items() if v not in (None, "")})
    with t[2]:
        leaderboard_view()
    with t[3]:
        inventory_public_view()
    with t[4]:
        camps_public_view()


def auth_page(label, role_key, login_path, register_fn=None):
    st.header(f"{label} access")
    if S().pending_2fa and S().pending_2fa["role"] == role_key:
        st.info("Two-step login is on for this account. Enter the 6-digit code from your authenticator app.")
        code = st.text_input("Authentication code", key=f"2fa_login_{role_key}")
        c1, c2 = st.columns(2)
        if c1.button("Verify", type="primary", key=f"2fa_verify_{role_key}"):
            res = api("POST", "/auth/login/2fa-verify", json={"temp_token": S().pending_2fa["temp"], "code": code})
            if res:
                S().role, S().token, S().pending_2fa = role_key, res["access_token"], None
                st.rerun()
        if c2.button("Cancel", key=f"2fa_cancel_{role_key}"):
            S().pending_2fa = None
            st.rerun()
        return
    tabs = st.tabs(["Log in"] + (["Sign up"] if register_fn else []))
    with tabs[0]:
        with st.form(f"login_{role_key}"):
            email = st.text_input("Email")
            pwd = st.text_input("Password", type="password")
            ok = st.form_submit_button("Log in", type="primary")
        if ok:
            res = api("POST", login_path, json={"email": email, "password": pwd})
            if res and res.get("requires_2fa"):
                S().pending_2fa = {"role": role_key, "temp": res["temp_token"]}
                st.rerun()
            elif res:
                S().role, S().token = role_key, res["access_token"]
                st.rerun()
    if register_fn:
        with tabs[1]:
            register_fn()


def _latlon(prefix):
    c1, c2 = st.columns(2)
    return (c1.number_input("Latitude", value=31.5204, format="%.5f", key=f"{prefix}_lat"),
            c2.number_input("Longitude", value=74.3587, format="%.5f", key=f"{prefix}_lon"))


def reg_donor():
    with st.form("reg_donor"):
        name = st.text_input("Full name")
        email = st.text_input("Email")
        pwd = st.text_input("Password", type="password")
        blood = st.selectbox("Blood type", BLOOD_TYPES)
        phone = st.text_input("Phone number")
        lat, lon = _latlon("rd")
        go = st.form_submit_button("Create donor account", type="primary")
    if go and api("POST", "/auth/register/donor", json=dict(full_name=name, email=email, password=pwd, blood_type=blood,
                                                           phone_number=phone, latitude=lat, longitude=lon)):
        st.success("Account created. Switch to the Log in tab. An admin will confirm your medical clearance.")


def reg_receiver():
    with st.form("reg_receiver"):
        name = st.text_input("Full name")
        email = st.text_input("Email")
        pwd = st.text_input("Password", type="password")
        phone = st.text_input("Phone number")
        cnic = st.text_input("CNIC number")
        addr = st.text_input("Address")
        patient = st.text_input("Patient name (if for someone else)")
        lat, lon = _latlon("rr")
        go = st.form_submit_button("Create patient account", type="primary")
    if go and api("POST", "/auth/register/receiver", json=dict(full_name=name, email=email, password=pwd,
                                                              phone_number=phone, cnic_number=cnic, address=addr,
                                                              patient_name=patient or None, latitude=lat, longitude=lon)):
        st.success("Account created. Switch to the Log in tab.")
    doc_check_widget("cnic", "CNIC number as typed above")


def reg_hospital():
    with st.form("reg_hospital"):
        name = st.text_input("Hospital name")
        email = st.text_input("Email")
        pwd = st.text_input("Password", type="password")
        lic = st.text_input("License number")
        phone = st.text_input("Phone number")
        lat, lon = _latlon("rh")
        go = st.form_submit_button("Create hospital account", type="primary")
    if go and api("POST", "/auth/register/hospital", json=dict(name=name, email=email, password=pwd, license_number=lic,
                                                              phone_number=phone, latitude=lat, longitude=lon)):
        st.success("Account created. An admin will verify your licence. Switch to the Log in tab.")
    doc_check_widget("licence", "Licence number as typed above")


# ---- Donor
def dash_donor():
    tok = S().token
    me = api("GET", "/donors/me", tok)
    if not me:
        return logout()
    stats = api("GET", "/donors/me/stats", tok) or {}
    st.title(f"🩸 Welcome, {me['full_name']}")
    c = st.columns(6)
    c[0].metric("Blood type", me["blood_type"])
    c[1].metric("Donations", stats.get("total_donations", 0))
    c[2].metric("Bags given", stats.get("total_units_donated", 0))
    c[3].metric("Points", stats.get("points", 0))
    c[4].metric("Rank", f"#{stats['leaderboard_rank']}" if stats.get("leaderboard_rank") else "-")
    c[5].metric("Rating", stats.get("average_rating") or "-")
    clearance = {"cleared": "✅ Medically cleared", "pending": "⏳ Medical clearance pending",
                 "flagged": "⚠️ Flagged by admin"}.get(me.get("medical_clearance_status"), "")
    st.caption(f"Badge: **{stats.get('badge_tier')}** · Lives impacted ≈ {stats.get('estimated_lives_impacted', 0)} · "
               + ("✅ Eligible to donate now" if stats.get("is_eligible_now")
                  else f"⏳ Next eligible: {fmt_dt(stats.get('next_eligible_date'))}") + f" · {clearance}")

    t = st.tabs(["Open requests", "My donations", "Camps", "Notifications", "My donor card", "Leaderboard",
                 "Blood stock", "Assistant"])
    with t[0]:
        reqs = [r for r in (api("GET", "/requests") or []) if r["status"] == "open"]
        if not reqs:
            st.info("No open requests right now.")
        for r in reqs:
            tag = "🚨 EMERGENCY" if r["urgency_type"] == "emergency" else f"⏱ {r['urgency_value']} {r['urgency_type']}"
            with st.expander(f"#{r['id']} · {r['blood_type_needed']} · {r['units_remaining']} bag(s) left · {tag} · {r['requester_name']}"):
                st.write(f"**Requester:** {r['requester_name']} ({r['requester_type']}) · 📞 {r['requester_phone']}")
                if r.get("requester_cnic"):
                    st.write(f"**CNIC:** {r['requester_cnic']} · **Address:** {r['requester_address']}")
                if r.get("patient_name"):
                    extra = " · ".join(str(x) for x in (r.get("patient_age"), r.get("patient_gender"), r.get("medical_reason")) if x)
                    st.write(f"**Patient:** {r['patient_name']} {('(' + extra + ')') if extra else ''}")
                if r.get("fulfilled_from_inventory"):
                    st.caption(f"🏥 {r['inventory_units_used']} bag(s) already supplied from hospital stock.")
                rep = api("GET", f"/ratings/requester/{r['requester_type']}/{r['requester_id']}", quiet=True)
                if rep:
                    st.caption("⭐ Requester rating: " + (f"{rep['average_stars']} ({rep['total_ratings']} rating(s) from donors)"
                                                          if rep["total_ratings"] else "no ratings yet"))
                n = st.number_input("Bags you can give", 1, max(r["units_remaining"], 1), 1, key=f"acc_n_{r['id']}")
                if st.button("✅ Accept & donate", key=f"acc_{r['id']}", type="primary"):
                    res = api("POST", f"/matching/{r['id']}/accept", tok, json={"units_donated": int(n)})
                    if res:
                        st.success(res["message"] + f" Contact {res['requester_name']}: {res['requester_phone']}")
                        st.rerun()
    with t[1]:
        mine = api("GET", f"/ratings/donor/{me['id']}", quiet=True)
        if mine:
            st.markdown("##### My reputation")
            st.write(f"⭐ {mine['average_stars']} average from {mine['total_ratings']} rating(s)"
                     if mine["total_ratings"] else "No ratings from requesters yet.")
            for rt_ in mine["ratings"][:5]:
                if rt_.get("comment"):
                    st.caption(f"“{rt_['comment']}” — {rt_['stars']}★")
        rows = api("GET", "/donations/donor/history", tok) or []
        show_table(rows, ["donation_id", "requester_name", "requester_phone", "blood_type_needed", "units_donated",
                          "donated_at"], key="donor_hist")
        if rows:
            st.markdown("##### Rate the recipient")
            opts = {f"#{r['donation_id']} — {r['requester_name']}": r["donation_id"] for r in rows}
            pick = st.selectbox("Donation", list(opts), key="dr_pick")
            stars = st.slider("Stars", 1, 5, 5, key="dr_stars")
            cm = st.text_input("Comment (optional)", key="dr_c")
            if st.button("Submit rating", key="dr_go"):
                if api("POST", f"/ratings/{opts[pick]}/rate-requester", tok, json={"stars": stars, "comment": cm or None}):
                    st.success("Thanks for rating!")
    with t[2]:
        camps = api("GET", "/camps") or []
        mine = {r["camp_id"] for r in (api("GET", "/camps/mine/rsvps", tok) or [])}
        if not camps:
            st.info("No upcoming camps.")
        for cp in camps:
            with st.expander(f"{cp['title']} · {cp['hospital_name']} · {fmt_dt(cp['camp_date'])}"):
                st.write(f"📍 {cp['location_label']}")
                if cp.get("description"):
                    st.write(cp["description"])
                st.caption(f"{cp['registered_count']} donor(s) registered")
                if cp["id"] in mine:
                    st.success("You are registered ✔")
                elif st.button("Register for this camp", key=f"rsvp_{cp['id']}") and api("POST", f"/camps/{cp['id']}/rsvp", tok):
                    st.rerun()
    with t[3]:
        notifications_view("donor", tok)
    with t[4]:
        st.write("Show this card at a donation camp for a quick check-in.")
        payload = f"LIFEFLOW-DONOR|id:{me['id']}|name:{me['full_name']}|type:{me['blood_type']}"
        c1, c2 = st.columns([1, 2])
        img = qr_image(payload)
        if img:
            c1.image(img, width=200)
        c2.markdown(f"### 🩸 LifeFlow Donor\n**{me['full_name']}**  \nBlood type: **{me['blood_type']}**  \n"
                    f"{stats.get('total_donations', 0)} donation(s) · {me['points']} points  \nDonor ID #{me['id']}")
    with t[5]:
        leaderboard_view()
    with t[6]:
        inventory_public_view()
    with t[7]:
        assistant_chat("donor", "donor")


# ---- Receiver
def dash_receiver():
    tok = S().token
    me = api("GET", "/receivers/me", tok)
    if not me:
        return logout()
    stats = api("GET", "/receivers/me/stats", tok) or {}
    st.title(f"🧑‍⚕️ Welcome, {me['full_name']}")
    c = st.columns(4)
    c[0].metric("Requests", stats.get("total_requests", 0))
    c[1].metric("Open", stats.get("open_requests", 0))
    c[2].metric("Fulfilled", stats.get("fulfilled_requests", 0))
    c[3].metric("Bags received", stats.get("total_units_received", 0))
    t = st.tabs(["New request", "My requests", "Donations received", "Notifications", "Blood stock", "Camps", "Assistant"])
    with t[0]:
        with st.expander("🤖 Type or speak your request (any language)", expanded=True):
            ai_request_reader("rx_reader")
        request_form("receiver", tok, me["latitude"], me["longitude"])
    with t[1]:
        my_requests_view("receiver", tok)
    with t[2]:
        donations_received_view("receiver", tok, me["id"])
    with t[3]:
        notifications_view("receiver", tok)
    with t[4]:
        inventory_public_view()
    with t[5]:
        camps_public_view()
    with t[6]:
        assistant_chat("receiver", "receiver")


# ---- Hospital
def dash_hospital():
    tok = S().token
    me = api("GET", "/hospitals/me", tok)
    if not me:
        return logout()
    stats = api("GET", "/hospitals/me/stats", tok) or {}
    st.title(f"🏥 {me['name']}")
    st.caption("✅ Verified hospital" if me.get("is_verified") else "⏳ Licence verification pending (admin)")
    c = st.columns(4)
    c[0].metric("Requests", stats.get("total_requests", 0))
    c[1].metric("Open", stats.get("open_requests", 0))
    c[2].metric("Fulfilled", stats.get("fulfilled_requests", 0))
    c[3].metric("Bags received", stats.get("total_units_received", 0))
    if stats.get("low_stock_types"):
        st.warning("Low stock: " + ", ".join(stats["low_stock_types"]))
    t = st.tabs(["New request", "My requests", "Donations received", "Blood inventory", "Shortage forecast",
                 "Donor allocation", "Re-engage donors", "Camps", "Staff & shifts", "Impact", "Ask about my data",
                 "Notifications", "Security"])
    with t[0]:
        with st.expander("🤖 Type or speak the request (any language)", expanded=True):
            ai_request_reader("hp_reader")
        request_form("hospital", tok, me["latitude"], me["longitude"])
    with t[1]:
        my_requests_view("hospital", tok)
    with t[2]:
        donations_received_view("hospital", tok, me["id"])
    with t[3]:
        inv = api("GET", "/inventory/me", tok) or []
        show_table(inv, ["blood_type", "units_available", "low_stock_threshold", "is_low", "updated_at"],
                   {"blood_type": "Blood", "units_available": "Units", "low_stock_threshold": "Low threshold",
                    "is_low": "Low?", "updated_at": "Updated"}, key="inv")
        with st.form("inv_form"):
            c1, c2, c3 = st.columns(3)
            bt = c1.selectbox("Blood type", BLOOD_TYPES)
            units = c2.number_input("Units available", min_value=0, value=0)
            thr = c3.number_input("Low-stock threshold", min_value=0, value=5)
            if st.form_submit_button("Update stock", type="primary"):
                if api("PUT", "/inventory/me", tok, json={"blood_type": bt, "units_available": int(units),
                                                           "low_stock_threshold": int(thr)}):
                    st.rerun()
        fhir = api("GET", f"/interop/fhir/inventory/{me['id']}", quiet=True)
        if fhir:
            import json as _json
            st.download_button("⬇️ Download stock as FHIR (health data standard)", _json.dumps(fhir, indent=2),
                               file_name="lifeflow_inventory_fhir.json", mime="application/json")
        with st.expander("📱 SMS commands (for people without internet)"):
            st.write("Point a Twilio number's incoming-message webhook to `/sms/inbound`. Commands: "
                     "`HELP`, `STOCK O+`, `OPEN` (donors), `NEED O+ 2` (hospitals).")
    with t[4]:
        forecast_view(tok)
    with t[5]:
        allocation_view(tok)
    with t[6]:
        reengagement_view(tok)
    with t[7]:
        st.markdown("##### Where to hold the next camp")
        camp_suggestions_view(tok)
        st.markdown("##### My camps")
        for cp in api("GET", "/camps/mine", tok) or []:
            with st.expander(f"{cp['title']} · {fmt_dt(cp['camp_date'])} · {cp['registered_count']} registered"):
                show_table(api("GET", f"/camps/{cp['id']}/rsvps", tok) or [],
                           ["donor_name", "donor_blood_type", "donor_phone", "status", "created_at"], key=f"rs{cp['id']}")
        with st.form("camp_form"):
            st.markdown("##### Organize a new camp")
            title = st.text_input("Title")
            desc = st.text_area("Description")
            loc = st.text_input("Location label")
            d = st.date_input("Date", value=datetime.now().date() + timedelta(days=7))
            c1, c2 = st.columns(2)
            lat = c1.number_input("Latitude", value=float(me["latitude"]), format="%.5f")
            lon = c2.number_input("Longitude", value=float(me["longitude"]), format="%.5f")
            if st.form_submit_button("Publish camp", type="primary"):
                if api("POST", "/camps", tok, json={"title": title, "description": desc or None, "location_label": loc,
                                                   "latitude": lat, "longitude": lon,
                                                   "camp_date": datetime.combine(d, dtime(9, 0)).isoformat()}):
                    st.success("Camp published; donors were notified.")
                    st.rerun()
    with t[8]:
        staff = api("GET", "/staff", tok) or []
        show_table(staff, ["full_name", "email", "shift", "phone_number"], key="staff_list")
        for s in staff:
            if st.button(f"Remove {s['full_name']}", key=f"rm_{s['id']}") and api("DELETE", f"/staff/{s['id']}", tok):
                st.rerun()
        with st.form("staff_form"):
            st.markdown("##### Create staff login")
            c1, c2 = st.columns(2)
            n = c1.text_input("Full name")
            e = c2.text_input("Email")
            p = c1.text_input("Password", type="password")
            sh = c2.selectbox("Shift", SHIFTS)
            ph = st.text_input("Phone (optional)")
            if st.form_submit_button("Create staff", type="primary"):
                if api("POST", "/staff", tok, json={"full_name": n, "email": e, "password": p, "shift": sh,
                                                   "phone_number": ph or None}):
                    st.rerun()
        st.markdown("##### Combined visitor record (all shifts)")
        show_table(api("GET", "/staff/hospital/visitors", tok) or [],
                   ["logged_at", "staff_name", "staff_shift", "visitor_type", "full_name", "blood_type", "phone_number",
                    "from_location", "notes"], key="hv")
    with t[9]:
        impact_view(tok)
    with t[10]:
        assistant_chat("hospital", "hospital")
        st.divider()
        q = st.text_input("Ask a question about your own hospital's data", key="data_q",
                          placeholder="How many O+ bags did we use this month?")
        if st.button("Ask", key="data_ask") and q:
            r = api("POST", "/ai/data-assistant", tok, json={"message": q})
            if r:
                st.write(r["reply"])
    with t[11]:
        notifications_view("hospital", tok)
    with t[12]:
        two_factor_view("hospital", tok)


# ---- Staff
def dash_staff():
    tok = S().token
    me = api("GET", "/staff/me", tok)
    if not me:
        return logout()
    st.title(f"🧑‍⚕️ {me['full_name']} — {me['shift']}")
    t1, t2, t3 = st.tabs(["Log a visitor", "My shift record", "Assistant"])
    with t1:
        with st.form("visitor"):
            vt = st.radio("Type", ["donor", "patient"], horizontal=True)
            c1, c2 = st.columns(2)
            nm = c1.text_input("Full name")
            bt = c2.selectbox("Blood type", [""] + BLOOD_TYPES)
            ph = c1.text_input("Phone")
            fl = c2.text_input("Came from")
            nt = st.text_area("Notes")
            if st.form_submit_button("Save entry", type="primary"):
                if api("POST", "/staff/visitors", tok, json={"visitor_type": vt, "full_name": nm, "blood_type": bt or None,
                                                            "phone_number": ph or None, "from_location": fl or None,
                                                            "notes": nt or None}):
                    st.success("Logged.")
    with t2:
        rows = api("GET", "/staff/visitors/mine", tok) or []
        c = st.columns(2)
        c[0].metric("Donors seen", sum(1 for r in rows if r["visitor_type"] == "donor"))
        c[1].metric("Patients seen", sum(1 for r in rows if r["visitor_type"] == "patient"))
        show_table(rows, ["logged_at", "visitor_type", "full_name", "blood_type", "phone_number", "from_location",
                          "notes"], key="mine_v")
    with t3:
        assistant_chat("staff", "staff")


# ---- Admin
def dash_admin():
    tok = S().token
    me = api("GET", "/admin/me", tok)
    if not me:
        return logout()
    if me.get("must_change_password"):
        st.title("🔐 Set your own admin login")
        st.info("This is the default admin account. Choose your own email and a new password (min 8 characters).")
        with st.form("chgcred"):
            cur = st.text_input("Current password", type="password")
            name = st.text_input("Full name", value=me["full_name"])
            email = st.text_input("New email", value=me["email"])
            new = st.text_input("New password", type="password")
            if st.form_submit_button("Save", type="primary"):
                if api("POST", "/admin/change-credentials", tok,
                       json={"current_password": cur, "new_email": email, "new_full_name": name, "new_password": new}):
                    st.rerun()
        return
    st.title("🛡️ Admin")
    platform_stats()
    t = st.tabs(["Verification", "Users", "Requests & donations", "Forecast", "Donor allocation", "Re-engage donors",
                 "Camp ideas", "Impact", "Flagged ratings", "Audit trail", "Reports", "System status", "Notifications",
                 "Security", "Assistant"])
    with t[0]:
        st.markdown("##### Hospitals waiting for licence verification")
        for h in api("GET", "/admin/verification/hospitals/pending", tok) or []:
            c = st.columns([4, 1, 1])
            c[0].write(f"**{h['name']}** · licence `{h['license_number']}` · {h['phone_number']}")
            if c[1].button("Approve", key=f"ha_{h['id']}") and api("POST", f"/admin/verification/hospitals/{h['id']}/approve", tok):
                st.rerun()
            if c[2].button("Reject", key=f"hr_{h['id']}") and api("POST", f"/admin/verification/hospitals/{h['id']}/reject", tok):
                st.rerun()
        st.markdown("##### Donors waiting for medical clearance")
        for d in api("GET", "/admin/verification/donors/pending", tok) or []:
            c = st.columns([4, 1, 1])
            c[0].write(f"**{d['full_name']}** · {d['blood_type']} · {d['phone_number']}")
            if c[1].button("Clear", key=f"dc_{d['id']}") and api("POST", f"/admin/verification/donors/{d['id']}/clear", tok):
                st.rerun()
            if c[2].button("Flag", key=f"df_{d['id']}") and api("POST", f"/admin/verification/donors/{d['id']}/flag", tok):
                st.rerun()
        st.caption("Donor medical eligibility is self-entered and should be confirmed by a medical provider in real use.")
    with t[1]:
        who = st.radio("Show", ["Donors", "Hospitals", "Patients", "Staff"], horizontal=True)
        path = {"Donors": "donors", "Hospitals": "hospitals", "Patients": "receivers", "Staff": "staff"}[who]
        show_table(api("GET", f"/admin/{path}", tok) or [], key=f"admin_{path}")
    with t[2]:
        a, b = st.tabs(["Requests", "Donations"])
        with a:
            show_table(api("GET", "/admin/requests", tok) or [], ["id", "requester_type", "requester_name",
                       "blood_type_needed", "units_needed", "units_fulfilled", "inventory_units_used", "status",
                       "urgency_type", "created_at"], key="admin_req")
        with b:
            show_table(api("GET", "/admin/donations", tok) or [], ["donation_id", "donor_name", "requester_name",
                       "blood_type_needed", "units_donated", "donated_at"], key="admin_don")
    with t[3]:
        forecast_view(tok, platform=True)
    with t[4]:
        allocation_view(tok)
    with t[5]:
        reengagement_view(tok)
    with t[6]:
        camp_suggestions_view(tok)
    with t[7]:
        impact_view(tok)
    with t[8]:
        flagged = api("GET", "/ratings/flagged", tok) or []
        st.caption("Comments the sentiment check marked as likely complaints.")
        show_table(flagged, ["created_at", "direction", "stars", "sentiment", "comment"], key="flagged")
    with t[9]:
        v = api("GET", "/admin/audit/verify", tok)
        if v:
            (st.success if v["valid"] else st.error)(
                f"Chain is intact: {v['checked']} events verified." if v["valid"]
                else f"⚠️ Tampering detected at event #{v['broken_at_id']}.")
        show_table(api("GET", "/admin/audit/log", tok, params={"limit": 100}) or [],
                   ["id", "created_at", "event_type", "actor_type", "actor_id", "hash"], key="audit")
    with t[10]:
        c1, c2, c3 = st.columns(3)
        bt = c1.selectbox("Blood type", ["All"] + BLOOD_TYPES, key="rep_bt")
        d1 = c2.date_input("From", value=None, key="rep_d1")
        d2 = c3.date_input("To", value=None, key="rep_d2")
        params = {}
        if bt != "All":
            params["blood_type"] = bt
        if d1:
            params["start_date"] = d1.isoformat()
        if d2:
            params["end_date"] = datetime.combine(d2, dtime(23, 59)).isoformat()
        rep = api("GET", "/admin/reports/summary", tok, params=params)
        if rep:
            c = st.columns(2)
            c[0].metric("Requests in range", rep["total_requests"])
            c[1].metric("Donations (all time)", rep["total_donations_all_time"])
            show_table(rep["by_blood_type"], key="report")
            csv = api("GET", "/admin/reports/export.csv", tok, params=params, raw=True)
            if csv:
                st.download_button("⬇️ Download report for health authorities (CSV)", csv,
                                   file_name="lifeflow_report.csv", mime="text/csv")
    with t[11]:
        s = api("GET", "/admin/delivery-status", tok) or {}
        for k, val in s.items():
            st.write(("✅ " if val else "⚪ ") + k.replace("_", " ").capitalize() + (" is configured" if val else " is not configured"))
        st.caption("Without SMS / email / push keys, alerts are shown in-app only. AI features need GROQ_API_KEY.")
    with t[12]:
        show_table(api("GET", "/admin/notifications", tok) or [], ["created_at", "user_type", "user_id", "title", "message"],
                   key="admin_notif")
    with t[13]:
        two_factor_view("admin", tok)
    with t[14]:
        assistant_chat("admin", "admin")


ROBOT_CSS = """
<style>
.st-key-robot_fab { position: fixed; bottom: 22px; right: 22px; z-index: 999990; width: auto !important; }
.st-key-robot_fab button {
    width: 62px; height: 62px; border-radius: 50%; font-size: 30px; padding: 0;
    background: #d62839; color: #fff; border: 3px solid #fff;
    box-shadow: 0 6px 18px rgba(0,0,0,.35);
}
.st-key-robot_fab button:hover { background: #8b1624; color: #fff; border-color: #fff; }
div[data-testid="stPopoverBody"] { width: min(400px, 92vw); max-height: 70vh; overflow-y: auto; }
</style>
"""


def robot_widget():
    """Floating 🤖 assistant button, bottom-right, shown on every page (home and every dashboard)."""
    role = S().role or "guest"
    key = f"robot_{role}"
    st.markdown(ROBOT_CSS, unsafe_allow_html=True)
    with st.container(key="robot_fab"):
        with st.popover("🤖", help="Ask the LifeFlow assistant"):
            titles = {"guest": "LifeFlow Assistant", "donor": "Donor Assistant", "receiver": "Patient Assistant",
                      "hospital": "Hospital Assistant", "staff": "Staff Assistant", "admin": "Admin Assistant"}
            st.markdown(f"**🤖 {titles.get(role, 'LifeFlow Assistant')}**")
            st.caption("Ask how LifeFlow works, about your requests, donations or stock. "
                       "I can't give medical advice.")
            hist = S().chat.setdefault(key, [])
            if not hist:
                st.info("Hi! How can I help you today?")
            for m in hist[-12:]:
                with st.chat_message(m["role"]):
                    st.write(m["text"])
            with st.form(f"robot_form_{role}", clear_on_submit=True):
                msg = st.text_input("Your message", key=f"robot_in_{role}", label_visibility="collapsed",
                                    placeholder="Type your question...")
                c1, c2 = st.columns([3, 1])
                send = c1.form_submit_button("Send", type="primary")
                clear = c2.form_submit_button("Clear")
            if clear:
                S().chat[key] = []
                st.rerun()
            if send and msg.strip():
                hist.append({"role": "user", "text": msg.strip()})
                res = api("POST", f"/ai/assistant/{role}", S().token, json={"message": msg.strip()}, quiet=True)
                hist.append({"role": "assistant", "text": res["reply"] if res else "Sorry, I couldn't answer right now."})
                st.rerun()


# ------------------------------------------------------------------- router
def main():
    init_state()
    role = S().role
    with st.sidebar:
        st.markdown("## 🩸 LifeFlow")
        if role:
            st.write(f"Signed in as **{role}**")
            if st.button("Log out"):
                logout()
            page = "dash"
        else:
            page = st.radio("Go to", ["Home", "Donor", "Patient", "Hospital", "Staff", "Admin"],
                            label_visibility="collapsed")
        st.divider()
        ai = api("GET", "/ai/status", quiet=True)
        st.caption("🤖 AI: " + ("online" if ai and ai.get("configured") else "backup mode (no GROQ_API_KEY)"))
    if role:
        {"donor": dash_donor, "receiver": dash_receiver, "hospital": dash_hospital,
         "staff": dash_staff, "admin": dash_admin}[role]()
    elif page == "Home":
        page_home()
    elif page == "Donor":
        auth_page("Donor", "donor", "/auth/login/donor", reg_donor)
    elif page == "Patient":
        auth_page("Patient", "receiver", "/auth/login/receiver", reg_receiver)
    elif page == "Hospital":
        auth_page("Hospital", "hospital", "/auth/login/hospital", reg_hospital)
    elif page == "Staff":
        auth_page("Hospital staff", "staff", "/auth/login/staff")
    elif page == "Admin":
        auth_page("Admin", "admin", "/auth/login/admin")
        st.caption("First-time login: admin@lifeflow.com / Admin@123 (you will be asked to set your own).")
    robot_widget()


main()

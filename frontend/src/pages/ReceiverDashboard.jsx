import React, { useEffect, useState } from "react";
import AIAssistantWidget from "../components/AIAssistantWidget.jsx";
import VoiceRecorderButton from "../components/VoiceRecorderButton.jsx";
import {
  createReceiverRequest,
  getMatches,
  getMyReceiverProfile,
  getReceiverDonationHistory,
  getReceiverRequestHistory,
  getReceiverStats,
  rateDonor,
  getAllHospitalInventories,
  getRequesterRatings,
  parseRequestText,
} from "../services/api";
import StarRating from "../components/StarRating.jsx";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

function describeUrgency(request) {
  if (request.urgency_type === "emergency") return "Emergency, needed right now";
  if (request.urgency_type === "days") return `Needed within ${request.urgency_value} day${request.urgency_value === 1 ? "" : "s"}`;
  if (request.urgency_type === "months") return `Needed within ${request.urgency_value} month${request.urgency_value === 1 ? "" : "s"}`;
  return "";
}

const TABS = [
  { key: "new", label: "Request blood" },
  { key: "myrequests", label: "My requests (full history)" },
  { key: "history", label: "Donations received" },
  { key: "stats", label: "Stats" },
];

export default function ReceiverDashboard() {
  const [tab, setTab] = useState("new");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    blood_type_needed: "O+",
    units_needed: 1,
    patient_name: "",
    patient_age: "",
    patient_gender: "",
    medical_reason: "",
    urgency_type: "emergency",
    urgency_value: "",
    latitude: "",
    longitude: "",
  });
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastRequestResult, setLastRequestResult] = useState(null);
  const [hospitalStock, setHospitalStock] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [aiIntakeText, setAiIntakeText] = useState("");
  const [aiIntakeNote, setAiIntakeNote] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  const [history, setHistory] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [stats, setStats] = useState(null);

  async function loadProfile() {
    try {
      const response = await getMyReceiverProfile();
      setProfile(response.data);
      getRequesterRatings("receiver", response.data.id).then((r) => setMyRating(r.data)).catch(() => setMyRating(null));
    } catch (error) {
      setProfile(null);
    }
  }
  async function loadHospitalStock() {
    try {
      const response = await getAllHospitalInventories();
      setHospitalStock(response.data);
    } catch (error) {
      setHospitalStock([]);
    }
  }
  async function handleAiAutofill() {
    if (!aiIntakeText.trim()) return;
    setIsAutofilling(true);
    setAiIntakeNote("");
    try {
      const response = await parseRequestText(aiIntakeText, parseFloat(form.latitude) || 0, parseFloat(form.longitude) || 0);
      const parsed = response.data;
      if (!parsed.understood) {
        setAiIntakeNote(parsed.note_to_user || "Couldn't understand that — please fill the form manually.");
        return;
      }
      setForm({
        ...form,
        blood_type_needed: parsed.blood_type_needed || form.blood_type_needed,
        units_needed: parsed.units_needed || form.units_needed,
        patient_name: parsed.patient_name || form.patient_name,
        patient_age: parsed.patient_age || form.patient_age,
        patient_gender: parsed.patient_gender || form.patient_gender,
        medical_reason: parsed.medical_reason || form.medical_reason,
        urgency_type: parsed.urgency_type || form.urgency_type,
        urgency_value: parsed.urgency_value || form.urgency_value,
      });
      setAiIntakeNote(parsed.note_to_user || "Form filled — please review before sending.");
    } catch (error) {
      setAiIntakeNote("Could not reach the AI assistant just now.");
    } finally {
      setIsAutofilling(false);
    }
  }
  async function loadHistory() {
    try {
      const response = await getReceiverDonationHistory();
      setHistory(response.data);
    } catch (error) {
      setHistory([]);
    }
  }
  async function loadMyRequests() {
    try {
      const response = await getReceiverRequestHistory();
      setMyRequests(response.data);
    } catch (error) {
      setMyRequests([]);
    }
  }
  async function loadStats() {
    try {
      const response = await getReceiverStats();
      setStats(response.data);
    } catch (error) {
      setStats(null);
    }
  }

  useEffect(() => {
    loadProfile();
    loadHistory();
    loadMyRequests();
    loadStats();
    loadHospitalStock();
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await createReceiverRequest({
        ...form,
        units_needed: parseInt(form.units_needed, 10),
        patient_age: form.patient_age ? parseInt(form.patient_age, 10) : null,
        urgency_value: form.urgency_type === "emergency" ? null : parseInt(form.urgency_value, 10),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
      setLastRequestResult(response.data);
      if (response.data.units_remaining > 0) {
        const matchResponse = await getMatches(response.data.id);
        setMatches(matchResponse.data);
      } else {
        setMatches([]);
      }
      setSearched(true);
      loadMyRequests();
    } catch (error) {
      setErrorMessage("Could not create the request. Please check your details and login status.");
    }
  }

  async function handleRateDonor(donationId, stars) {
    try {
      await rateDonor(donationId, stars, "");
    } catch (error) {
      // Silently ignore; the control already shows as submitted.
    }
  }

  return (
    <div className="page">
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">Patient</span>
            <span className="name">{profile.full_name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {myRating && myRating.average_stars && (
              <span className="avg-rating-chip">★ {myRating.average_stars} ({myRating.total_ratings})</span>
            )}
            <span>{profile.phone_number}</span>
          </div>
        </div>
      )}

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-button ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <>
          <div className="card">
            <h2>Hospital stock near you</h2>
            <p className="subtitle">
              We always check hospital blood banks for <strong>{form.blood_type_needed}</strong> before contacting
              a single donor. Here is what nearby hospitals currently report.
            </p>
            {hospitalStock.length === 0 && (
              <p className="empty-state">No hospital has published inventory yet. Donors will still be matched normally.</p>
            )}
            {hospitalStock.map((hospital) => {
              const row = (hospital.items || []).find((item) => item.blood_type === form.blood_type_needed);
              if (!row) return null;
              return (
                <div className="list-row" key={hospital.hospital_id}>
                  <div className="meta">{hospital.hospital_name}</div>
                  <span className={row.units_available > 0 ? "source-tag" : "empty-state"}>
                    {row.units_available > 0
                      ? `${row.units_available} bag(s) of ${form.blood_type_needed} in stock`
                      : "Out of stock"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2>Request blood</h2>
            <p className="subtitle">Tell donors how many bags you need and how soon. Existing hospital stock is used automatically first.</p>
            {errorMessage && <p className="error-text">{errorMessage}</p>}

            <div className="ai-intake-box">
              <label>Describe the need in your own words (any language) — AI will fill the form below</label>
              <textarea
                rows={2} placeholder="e.g. Mera walid ko O negative khoon chahiye, surgery hai"
                value={aiIntakeText} onChange={(e) => setAiIntakeText(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button type="button" className="btn-outline" style={{ marginTop: "10px" }} onClick={handleAiAutofill} disabled={isAutofilling}>
                  {isAutofilling ? "Reading..." : "Auto-fill with AI"}
                </button>
                <VoiceRecorderButton onTranscript={(text) => setAiIntakeText(text)} />
              </div>
              {aiIntakeNote && <p className="empty-state">{aiIntakeNote}</p>}
            </div>

            <form onSubmit={handleSubmit}>
              <label>Blood type needed</label>
              <select name="blood_type_needed" value={form.blood_type_needed} onChange={handleChange}>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <label>Bags needed</label>
              <input name="units_needed" type="number" min="1" placeholder="Bags needed" value={form.units_needed} onChange={handleChange} required />

              <label>Patient name, optional</label>
              <input name="patient_name" placeholder="Patient name" value={form.patient_name} onChange={handleChange} />

              <label>Patient age, optional</label>
              <input name="patient_age" type="number" min="0" placeholder="Patient age" value={form.patient_age} onChange={handleChange} />

              <label>Patient gender, optional</label>
              <select name="patient_gender" value={form.patient_gender} onChange={handleChange}>
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>

              <label>Reason / condition, optional</label>
              <input name="medical_reason" placeholder="e.g. surgery, accident, thalassemia" value={form.medical_reason} onChange={handleChange} />

              <label>How soon is it needed</label>
              <select name="urgency_type" value={form.urgency_type} onChange={handleChange}>
                <option value="emergency">Emergency, needed right now</option>
                <option value="days">Needed within a number of days</option>
                <option value="months">Needed within a number of months</option>
              </select>

              {form.urgency_type !== "emergency" && (
                <>
                  <label>Number of {form.urgency_type === "days" ? "days" : "months"}</label>
                  <input name="urgency_value" type="number" min="1" placeholder={`Number of ${form.urgency_type}`} value={form.urgency_value} onChange={handleChange} required />
                </>
              )}

              <label>Latitude</label>
              <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} required />

              <label>Longitude</label>
              <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} required />

              <button type="submit">Send request and find donors</button>
            </form>
          </div>

          {searched && lastRequestResult && lastRequestResult.inventory_units_used > 0 && (
            <div className="card">
              <h2>Hospital stock checked first</h2>
              <p className="notice-text">
                <span className="source-tag">Checked inventory before donors</span>
                &nbsp; {lastRequestResult.inventory_units_used} bag(s) of {lastRequestResult.blood_type_needed} were
                already available{lastRequestResult.fulfilling_hospital_name ? ` at ${lastRequestResult.fulfilling_hospital_name}` : ""} and
                have been reserved for this request automatically.
              </p>
              {lastRequestResult.units_remaining > 0 && (
                <p className="empty-state">{lastRequestResult.units_remaining} bag(s) are still short — nearby donors have been notified below.</p>
              )}
              {lastRequestResult.units_remaining === 0 && (
                <p className="empty-state">The full request is covered from existing hospital stock. No donor call-out was needed.</p>
              )}
            </div>
          )}

          {searched && (
            <div className="card">
              <h2>Matching donors</h2>
              <p className="subtitle">Closest and most recently eligible donors appear first, with contact number.</p>
              {lastRequestResult && lastRequestResult.units_remaining === 0 && (
                <p className="empty-state">No donor search was needed — see the stock notice above.</p>
              )}
              {(!lastRequestResult || lastRequestResult.units_remaining > 0) && matches.length === 0 && (
                <p className="empty-state">No compatible donors were found within range for this request.</p>
              )}
              {matches.map((match) => (
                <div className="list-row-stack" key={match.donor_id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className="badge">{match.blood_type}</span>
                      &nbsp; {match.full_name}
                    </div>
                    <span className="distance">{match.distance_kilometers} km away</span>
                  </div>
                  {match.match_reason && <div className="match-reason">Why this donor: {match.match_reason}</div>}
                  <div className="contact-block">
                    <div className="contact-label">Contact this donor</div>
                    <div className="contact-phone">{match.phone_number}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "myrequests" && (
        <div className="card">
          <PrintHeader title="My requests — full history" subtitle={profile ? profile.full_name : ""} />
          <div className="list-row-top">
            <h2>My requests — full history</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">Every request you have ever sent, open, closed, or still waiting for a donor.</p>
          {myRequests.length === 0 && <p className="empty-state">You have not sent a request yet.</p>}
          {myRequests.map((r) => (
            <div className="list-row-stack" key={r.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{r.blood_type_needed}</span>
                  &nbsp; {r.units_fulfilled}/{r.units_needed} bags fulfilled
                </div>
                <span className="distance">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                Status: {r.status} · {describeUrgency(r)}
                {r.patient_name ? ` · Patient: ${r.patient_name}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <PrintHeader title="Donations received" subtitle={profile ? profile.full_name : ""} />
          <div className="list-row-top">
            <h2>Donations received</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">Every donation given against your requests, with full donor details.</p>
          {history.length === 0 && <p className="empty-state">No donor has fulfilled a request yet.</p>}
          {history.map((item) => (
            <div className="list-row-stack" key={item.donation_id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{item.donor_blood_type}</span>
                  &nbsp; {item.donor_name}
                </div>
                <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {item.units_donated} bag{item.units_donated === 1 ? "" : "s"} donated · Phone: {item.donor_phone}
                {item.patient_name ? ` · Patient: ${item.patient_name}` : ""} · Request status: {item.request_status}
              </div>
              <div style={{ marginTop: "10px" }}>
                <div className="contact-label" style={{ marginBottom: "4px" }}>Rate this donor</div>
                <StarRating onSubmit={(stars) => handleRateDonor(item.donation_id, stars)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="card">
          <h2>Stats</h2>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-value">{stats.total_requests}</div><div className="stat-label">Total requests</div></div>
            <div className="stat-card"><div className="stat-value">{stats.open_requests}</div><div className="stat-label">Open requests</div></div>
            <div className="stat-card"><div className="stat-value">{stats.fulfilled_requests}</div><div className="stat-label">Fulfilled requests</div></div>
            <div className="stat-card"><div className="stat-value">{stats.total_units_received}</div><div className="stat-label">Bags received</div></div>
          </div>
        </div>
      )}
      <AIAssistantWidget role="receiver" />
    </div>
  );
}

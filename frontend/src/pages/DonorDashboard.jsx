import React, { useEffect, useState } from "react";
import {
  listBloodRequests,
  acceptRequest,
  getMyDonorProfile,
  getDonorDonationHistory,
  getDonorStats,
  rateRequester,
  listUpcomingCamps,
  rsvpToCamp,
  listMyRsvps,
} from "../services/api";
import StarRating from "../components/StarRating.jsx";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";
import DonorIdCard from "../components/DonorIdCard.jsx";
import AIAssistantWidget from "../components/AIAssistantWidget.jsx";
import { ShieldCheckIcon } from "../components/Icons.jsx";

function describeUrgency(request) {
  if (request.urgency_type === "emergency") return "Emergency, needed right now";
  if (request.urgency_type === "days") return `Needed within ${request.urgency_value} day${request.urgency_value === 1 ? "" : "s"}`;
  if (request.urgency_type === "months") return `Needed within ${request.urgency_value} month${request.urgency_value === 1 ? "" : "s"}`;
  return "";
}

const TABS = [
  { key: "requests", label: "Open requests" },
  { key: "history", label: "My donations" },
  { key: "camps", label: "Donation camps" },
  { key: "stats", label: "My stats & badges" },
];

export default function DonorDashboard() {
  const [tab, setTab] = useState("requests");
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [donateAmounts, setDonateAmounts] = useState({});
  const [message, setMessage] = useState("");
  const [acceptedContact, setAcceptedContact] = useState(null);

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [camps, setCamps] = useState([]);
  const [myRsvpCampIds, setMyRsvpCampIds] = useState([]);
  const [detailRequest, setDetailRequest] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);

  async function loadRequests() {
    const response = await listBloodRequests();
    setRequests(response.data.filter((item) => item.status === "open"));
  }

  async function loadProfile() {
    try {
      const response = await getMyDonorProfile();
      setProfile(response.data);
    } catch (error) {
      setProfile(null);
    }
  }

  async function loadHistory() {
    try {
      const response = await getDonorDonationHistory();
      setHistory(response.data);
    } catch (error) {
      setHistory([]);
    }
  }

  async function loadStats() {
    try {
      const response = await getDonorStats();
      setStats(response.data);
    } catch (error) {
      setStats(null);
    }
  }

  async function loadCamps() {
    try {
      const [campsResponse, rsvpResponse] = await Promise.all([listUpcomingCamps(), listMyRsvps()]);
      setCamps(campsResponse.data);
      setMyRsvpCampIds(rsvpResponse.data.map((r) => r.camp_id));
    } catch (error) {
      setCamps([]);
    }
  }

  useEffect(() => {
    loadProfile();
    loadRequests();
    loadHistory();
    loadStats();
    loadCamps();
  }, []);

  function handleAmountChange(requestId, value) {
    setDonateAmounts({ ...donateAmounts, [requestId]: value });
  }

  async function handleAccept(request) {
    const chosenAmount = parseInt(donateAmounts[request.id], 10) || 1;
    try {
      const response = await acceptRequest(request.id, chosenAmount);
      setMessage(response.data.message);
      setAcceptedContact(response.data);
      setDetailRequest(null);
      loadRequests();
      loadProfile();
      loadHistory();
      loadStats();
    } catch (error) {
      setMessage("Could not accept this request. It may already be fully covered.");
    }
  }

  function handleReject(requestId) {
    setDismissedIds([...dismissedIds, requestId]);
    setDetailRequest(null);
  }

  async function handleRsvp(campId) {
    try {
      await rsvpToCamp(campId);
      loadCamps();
    } catch (error) {
      // The camp list already prevents duplicate RSVPs visually.
    }
  }

  async function handleRateRequester(donationId, stars) {
    try {
      await rateRequester(donationId, stars, "");
    } catch (error) {
      // If rating fails silently, the star control still shows as submitted.
    }
  }

  return (
    <div className="page">
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">Donor</span>
            <span className="name">{profile.full_name}</span>
            &nbsp; ({profile.blood_type})
            {profile.medical_clearance_status === "cleared" && (
              <span className="source-tag" style={{ marginLeft: "10px" }}>Medically cleared</span>
            )}
            {profile.medical_clearance_status === "flagged" && (
              <span className="empty-state" style={{ marginLeft: "10px" }}>Flagged — contact support</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {stats && stats.average_rating && (
              <span className="avg-rating-chip">★ {stats.average_rating}</span>
            )}
            <span>{profile.points} points</span>
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

      {tab === "requests" && (
        <>
          {acceptedContact && (
            <div className="card">
              <h2>You accepted a request</h2>
              <p className="notice-text">{acceptedContact.message}</p>
              <div className="contact-block">
                <div className="contact-label">
                  Go to, or call, {acceptedContact.requester_type === "hospital" ? "the hospital" : "the patient's contact"}
                </div>
                <div className="contact-name">
                  {acceptedContact.requester_name}
                  {acceptedContact.patient_name ? ` — patient: ${acceptedContact.patient_name}` : ""}
                </div>
                <div className="contact-phone">{acceptedContact.requester_phone}</div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Open emergency requests</h2>
            <p className="subtitle">Ranked by how urgently your blood type is needed nearby.</p>
            {!acceptedContact && message && <p className="notice-text">{message}</p>}
            {requests.filter((r) => !dismissedIds.includes(r.id)).length === 0 && (
              <p className="empty-state">There are no open requests right now. You will be notified the moment one appears.</p>
            )}
            {requests.filter((r) => !dismissedIds.includes(r.id)).map((request) => (
              <div className="list-row-stack" key={request.id}>
                <div className="list-row-top">
                  <div className="meta">
                    <span className={request.requester_type === "hospital" ? "tag-hospital" : "tag-receiver"}>
                      {request.requester_type === "hospital" ? "Hospital" : "Patient"}
                    </span>
                    &nbsp;
                    <span className="badge">{request.blood_type_needed}</span>
                    &nbsp; {request.requester_name}
                  </div>
                </div>

                <div className="empty-state">
                  {request.units_remaining} of {request.units_needed} bag{request.units_needed === 1 ? "" : "s"} still needed
                  &nbsp;·&nbsp; {describeUrgency(request)}
                  {request.patient_name ? ` · Patient: ${request.patient_name}` : ""}
                  {request.patient_age ? `, age ${request.patient_age}` : ""}
                  {request.patient_gender ? ` (${request.patient_gender})` : ""}
                </div>
                {request.medical_reason && <div className="empty-state">Reason: {request.medical_reason}</div>}
                {request.inventory_units_used > 0 && (
                  <div className="empty-state"><span className="source-tag">{request.inventory_units_used} bag(s) already covered from hospital stock</span></div>
                )}

                {request.requester_type === "receiver" && (
                  <div className="empty-state">
                    CNIC: {request.requester_cnic} &nbsp;·&nbsp; Address: {request.requester_address} &nbsp;·&nbsp; Phone: {request.requester_phone}
                  </div>
                )}
                {request.requester_type === "hospital" && (
                  <div className="empty-state">Phone: {request.requester_phone}</div>
                )}

                <div className="list-row-top" style={{ marginTop: "10px" }}>
                  <label style={{ margin: 0 }}>
                    Bags you can give
                    <input
                      type="number"
                      min="1"
                      max={request.units_remaining}
                      defaultValue="1"
                      style={{ width: "90px", marginTop: "6px" }}
                      onChange={(event) => handleAmountChange(request.id, event.target.value)}
                    />
                  </label>
                  <button onClick={() => handleAccept(request)}>Accept and donate</button>
                  <button className="btn-outline" onClick={() => setDetailRequest(request)}>View full details</button>
                  <button className="btn-outline" onClick={() => handleReject(request.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="card">
          <PrintHeader title="My donation history" subtitle={profile ? `${profile.full_name} · ${profile.blood_type}` : ""} />
          <div className="list-row-top">
            <h2>My donation history</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">Every bag you have given, and exactly who received it.</p>
          {history.length === 0 && <p className="empty-state">You have not made a donation yet.</p>}
          {history.map((item) => (
            <div className="list-row-stack" key={item.donation_id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className={item.requester_type === "hospital" ? "tag-hospital" : "tag-receiver"}>
                    {item.requester_type === "hospital" ? "Hospital" : "Patient"}
                  </span>
                  &nbsp; <span className="badge">{item.blood_type_needed}</span>
                  &nbsp; {item.requester_name}
                </div>
                <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {item.units_donated} bag{item.units_donated === 1 ? "" : "s"} donated
                {item.patient_name ? ` · Patient: ${item.patient_name}` : ""} · Request status: {item.request_status}
              </div>
              {item.requester_type === "receiver" && (
                <div className="empty-state">
                  CNIC: {item.requester_cnic} &nbsp;·&nbsp; Address: {item.requester_address} &nbsp;·&nbsp; Phone: {item.requester_phone}
                </div>
              )}
              {item.requester_type === "hospital" && (
                <div className="empty-state">Phone: {item.requester_phone}</div>
              )}
              <div style={{ marginTop: "10px" }}>
                <div className="contact-label" style={{ marginBottom: "4px" }}>Rate this hospital / patient</div>
                <StarRating onSubmit={(stars) => handleRateRequester(item.donation_id, stars)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "camps" && (
        <div className="card">
          <h2>Upcoming donation camps</h2>
          <p className="subtitle">Organized blood drives from nearby hospitals. Register to reserve a slot.</p>
          {camps.length === 0 && <p className="empty-state">No camps are scheduled right now.</p>}
          {camps.map((camp) => (
            <div className="list-row-stack" key={camp.id}>
              <div className="list-row-top">
                <div className="meta">
                  <strong>{camp.title}</strong> &nbsp; <span className="tag-hospital">{camp.hospital_name}</span>
                </div>
                <span className="distance">{new Date(camp.camp_date).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {camp.location_label} · {camp.registered_count} donor{camp.registered_count === 1 ? "" : "s"} registered
                {camp.description ? ` · ${camp.description}` : ""}
              </div>
              {myRsvpCampIds.includes(camp.id) ? (
                <p className="notice-text">You are registered for this camp.</p>
              ) : (
                <button className="inline-btn" onClick={() => handleRsvp(camp.id)}>Register to attend</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="card">
          <h2>My stats & badges</h2>
          <p className="subtitle">
            <span className="badge-tier">{stats.badge_tier}</span>
          </p>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total_donations}</div>
              <div className="stat-label">Total donations</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_units_donated}</div>
              <div className="stat-label">Bags given</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.estimated_lives_impacted}</div>
              <div className="stat-label">Estimated lives impacted</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.points}</div>
              <div className="stat-label">Points</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.average_rating ?? "—"}</div>
              <div className="stat-label">Average rating</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.leaderboard_rank ? `#${stats.leaderboard_rank}` : "—"}</div>
              <div className="stat-label">Leaderboard rank</div>
            </div>
          </div>
          <p className="empty-state">
            {stats.is_eligible_now
              ? "You are eligible to donate right now."
              : `You will be eligible again on ${new Date(stats.next_eligible_date).toLocaleDateString()}.`}
          </p>
        </div>
      )}
      {tab === "stats" && profile && stats && (
        <DonorIdCard profile={profile} donationCount={stats.total_donations} />
      )}
      <AIAssistantWidget role="donor" />

      {detailRequest && (
        <div className="modal-backdrop" onClick={() => setDetailRequest(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailRequest(null)}>Close</button>
            <h2><ShieldCheckIcon size={20} color="#B01E28" /> Full request details</h2>
            <p className="subtitle">Review everything before you accept or reject.</p>
            <div className="detail-row"><span className="detail-label">Requested by</span><span className="detail-value">{detailRequest.requester_name} ({detailRequest.requester_type === "hospital" ? "Hospital" : "Patient"})</span></div>
            <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{detailRequest.requester_phone}</span></div>
            {detailRequest.requester_type === "receiver" && (
              <>
                <div className="detail-row"><span className="detail-label">CNIC</span><span className="detail-value">{detailRequest.requester_cnic}</span></div>
                <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{detailRequest.requester_address}</span></div>
              </>
            )}
            <div className="detail-row"><span className="detail-label">Patient</span><span className="detail-value">{detailRequest.patient_name || "Not provided"}</span></div>
            <div className="detail-row"><span className="detail-label">Age / gender</span><span className="detail-value">{detailRequest.patient_age || "—"} {detailRequest.patient_gender ? `/ ${detailRequest.patient_gender}` : ""}</span></div>
            <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{detailRequest.medical_reason || "Not provided"}</span></div>
            <div className="detail-row"><span className="detail-label">Blood type</span><span className="detail-value">{detailRequest.blood_type_needed}</span></div>
            <div className="detail-row"><span className="detail-label">Bags needed / remaining</span><span className="detail-value">{detailRequest.units_needed} / {detailRequest.units_remaining}</span></div>
            <div className="detail-row"><span className="detail-label">Urgency</span><span className="detail-value">{describeUrgency(detailRequest)}</span></div>
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button onClick={() => handleAccept(detailRequest)}>Accept and donate</button>
              <button className="btn-outline" onClick={() => handleReject(detailRequest.id)}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

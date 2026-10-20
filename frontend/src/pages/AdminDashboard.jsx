import React, { useEffect, useState } from "react";
import AdminGovernancePanel from "../components/AdminGovernancePanel.jsx";
import AIAssistantWidget from "../components/AIAssistantWidget.jsx";
import { useNavigate } from "react-router-dom";
import {
  getAllDonorsAdmin,
  getAllHospitalsAdmin,
  getAllReceiversAdmin,
  getAllRequestsAdmin,
  getAllDonationsAdmin,
  getAllNotificationsAdmin,
  getDonorHistoryAdmin,
  getHospitalHistoryAdmin,
  getReceiverHistoryAdmin,
  getAllStaffAdmin,
  getStaffHistoryAdmin,
  getMyAdminProfile,
} from "../services/api";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";

const TABS = [
  { key: "donors", label: "Donors" },
  { key: "hospitals", label: "Hospitals" },
  { key: "receivers", label: "Patients" },
  { key: "staff", label: "Hospital staff" },
  { key: "requests", label: "All requests (full history)" },
  { key: "donations", label: "All donations (full history)" },
  { key: "notifications", label: "All messages / requests" },
  { key: "governance", label: "Verification, audit & AI" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("donors");
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staff, setStaff] = useState([]);

  const [drilldown, setDrilldown] = useState(null); // { type, id, name, items }

  async function loadAll() {
    try {
      const [d, h, r, req, don, notif, st] = await Promise.all([
        getAllDonorsAdmin(),
        getAllHospitalsAdmin(),
        getAllReceiversAdmin(),
        getAllRequestsAdmin(),
        getAllDonationsAdmin(),
        getAllNotificationsAdmin(),
        getAllStaffAdmin(),
      ]);
      setDonors(d.data);
      setHospitals(h.data);
      setReceivers(r.data);
      setRequests(req.data);
      setDonations(don.data);
      setNotifications(notif.data);
      setStaff(st.data);
    } catch (error) {
      // Stays empty if the admin token is missing or expired.
    }
  }

  useEffect(() => {
    // Guards against someone reaching the dashboard directly (URL bar, back
    // button) before they've replaced the default admin credentials.
    getMyAdminProfile()
      .then((response) => {
        if (response.data.must_change_password) {
          navigate("/admin/change-credentials");
        } else {
          loadAll();
        }
      })
      .catch(() => navigate("/admin/login"));
  }, []);

  async function openDonorHistory(donor) {
    const response = await getDonorHistoryAdmin(donor.id);
    setDrilldown({ type: "donor", name: donor.full_name, items: response.data });
  }
  async function openHospitalHistory(hospital) {
    const response = await getHospitalHistoryAdmin(hospital.id);
    setDrilldown({ type: "hospital", name: hospital.name, items: response.data });
  }
  async function openReceiverHistory(receiver) {
    const response = await getReceiverHistoryAdmin(receiver.id);
    setDrilldown({ type: "receiver", name: receiver.full_name, items: response.data });
  }
  async function openStaffHistory(member) {
    const response = await getStaffHistoryAdmin(member.id);
    setDrilldown({ type: "staff", name: `${member.full_name} (${member.shift})`, items: response.data });
  }

  return (
    <div className="page">
      <div className="profile-bar">
        <div>
          <span className="role-tag">Admin</span>
          <span className="name">LifeFlow control panel</span>
        </div>
        <div>
          {donors.length} donors · {hospitals.length} hospitals · {receivers.length} patients
        </div>
      </div>

      <div className="tab-row">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-button ${tab === t.key ? "active" : ""}`}
            onClick={() => {
              setTab(t.key);
              setDrilldown(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {drilldown && (
        <div className="card">
          <PrintHeader title={`${drilldown.name}'s full history`} subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>{drilldown.name}'s full history</h2>
            <PrintButton />
          </div>
          <button className="inline-btn btn-outline no-print" onClick={() => setDrilldown(null)} style={{ marginBottom: "12px" }}>
            Close
          </button>
          {drilldown.items.length === 0 && <p className="empty-state">No history yet.</p>}
          {drilldown.type === "donor"
            ? drilldown.items.map((item) => (
                <div className="list-row-stack" key={item.donation_id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className="badge">{item.blood_type_needed}</span>
                      &nbsp; gave to {item.requester_name}
                    </div>
                    <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
                  </div>
                  <div className="empty-state">
                    {item.units_donated} bag{item.units_donated === 1 ? "" : "s"} · Status: {item.request_status}
                  </div>
                </div>
              ))
            : drilldown.type === "staff"
            ? drilldown.items.map((item) => (
                <div className="list-row-stack" key={item.id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className={item.visitor_type === "donor" ? "tag-hospital" : "tag-receiver"}>
                        {item.visitor_type === "donor" ? "Donor" : "Patient"}
                      </span>
                      &nbsp; {item.full_name} {item.blood_type ? `· ${item.blood_type}` : ""}
                    </div>
                    <span className="distance">{new Date(item.logged_at).toLocaleString()}</span>
                  </div>
                  <div className="empty-state">
                    {item.from_location ? `From: ${item.from_location}` : ""}
                    {item.phone_number ? ` · Phone: ${item.phone_number}` : ""}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </div>
                </div>
              ))
            : drilldown.items.map((item) => (
                <div className="list-row-stack" key={item.id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className="badge">{item.blood_type_needed}</span>
                      &nbsp; {item.units_remaining} of {item.units_needed} still needed
                    </div>
                    <span className="distance">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <div className="empty-state">Status: {item.status}{item.patient_name ? ` · Patient: ${item.patient_name}` : ""}</div>
                </div>
              ))}
        </div>
      )}

      {!drilldown && tab === "governance" && <AdminGovernancePanel />}

      {!drilldown && tab === "donors" && (
        <div className="card">
          <h2>Every donor</h2>
          <p className="subtitle">Click a donor to see their full donation history.</p>
          {donors.map((d) => (
            <div className="list-row-stack" key={d.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{d.blood_type}</span>
                  &nbsp; {d.full_name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{d.email}</span>
                </div>
                <span className="distance">{d.points} points</span>
              </div>
              <button className="inline-btn" onClick={() => openDonorHistory(d)}>View full history</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "hospitals" && (
        <div className="card">
          <h2>Every hospital</h2>
          <p className="subtitle">Click a hospital to see their full request history.</p>
          {hospitals.map((h) => (
            <div className="list-row-stack" key={h.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="tag-hospital">Hospital</span>
                  &nbsp; {h.name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{h.email}</span>
                </div>
                <span className="distance">{h.phone_number}</span>
              </div>
              <button className="inline-btn" onClick={() => openHospitalHistory(h)}>View full history</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "receivers" && (
        <div className="card">
          <h2>Every patient</h2>
          <p className="subtitle">Click a patient to see their full request history.</p>
          {receivers.map((r) => (
            <div className="list-row-stack" key={r.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="tag-receiver">Patient</span>
                  &nbsp; {r.full_name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{r.email}</span>
                </div>
                <span className="distance">{r.phone_number}</span>
              </div>
              <button className="inline-btn" onClick={() => openReceiverHistory(r)}>View full history</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "staff" && (
        <div className="card">
          <h2>Every hospital staff member, every shift</h2>
          <p className="subtitle">Click a staff member to see their full shift record.</p>
          {staff.map((s) => (
            <div className="list-row-stack" key={s.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{s.shift}</span>
                  &nbsp; {s.full_name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{s.email}</span>
                </div>
                <span className="distance">Hospital #{s.hospital_id}</span>
              </div>
              <button className="inline-btn" onClick={() => openStaffHistory(s)}>View full shift record</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "requests" && (
        <div className="card">
          <PrintHeader title="Every request ever made" subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>Every request ever made, any status</h2>
            <PrintButton />
          </div>
          {requests.map((r) => (
            <div className="list-row-stack" key={r.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className={r.requester_type === "hospital" ? "tag-hospital" : "tag-receiver"}>
                    {r.requester_type === "hospital" ? "Hospital" : "Patient"}
                  </span>
                  &nbsp; <span className="badge">{r.blood_type_needed}</span>
                  &nbsp; {r.requester_name}
                </div>
                <span className="distance">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                Status: {r.status} · {r.units_fulfilled}/{r.units_needed} bags fulfilled
                {r.patient_name ? ` · Patient: ${r.patient_name}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "donations" && (
        <div className="card">
          <PrintHeader title="Every completed donation" subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>Every completed donation</h2>
            <PrintButton />
          </div>
          {donations.map((item) => (
            <div className="list-row-stack" key={item.donation_id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{item.donor_blood_type}</span>
                  &nbsp; {item.donor_name} → {item.requester_name}
                </div>
                <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {item.units_donated} bag{item.units_donated === 1 ? "" : "s"} · Request status: {item.request_status}
              </div>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "notifications" && (
        <div className="card">
          <PrintHeader title="Every message / request notification" subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>Every message / request notification sent, full history</h2>
            <PrintButton />
          </div>
          {notifications.map((n) => (
            <div className="list-row-stack" key={n.id}>
              <div className="list-row-top">
                <div className="meta">{n.title}</div>
                <span className="distance">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">{n.message}</div>
            </div>
          ))}
        </div>
      )}
      <AIAssistantWidget role="admin" />
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { DataAssistantCard } from "../components/AIToolsPanel.jsx";
import AIAssistantWidget from "../components/AIAssistantWidget.jsx";
import {
  getMyStaffProfile,
  logVisitor,
  getMyVisitorEntries,
} from "../services/api";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";

const TABS = [
  { key: "log", label: "Log a visit" },
  { key: "record", label: "My shift record" },
];

export default function StaffDashboard() {
  const [tab, setTab] = useState("log");
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    visitor_type: "donor",
    full_name: "",
    blood_type: "",
    phone_number: "",
    from_location: "",
    notes: "",
  });

  async function loadProfile() {
    try {
      const response = await getMyStaffProfile();
      setProfile(response.data);
    } catch (error) {
      setProfile(null);
    }
  }

  async function loadEntries() {
    try {
      const response = await getMyVisitorEntries();
      setEntries(response.data);
    } catch (error) {
      setEntries([]);
    }
  }

  useEffect(() => {
    loadProfile();
    loadEntries();
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    try {
      await logVisitor(form);
      setForm({ visitor_type: form.visitor_type, full_name: "", blood_type: "", phone_number: "", from_location: "", notes: "" });
      setMessage("Saved to your shift record.");
      loadEntries();
    } catch (error) {
      setMessage("Could not save this entry. Please try again.");
    }
  }

  const donorCount = entries.filter((e) => e.visitor_type === "donor").length;
  const patientCount = entries.filter((e) => e.visitor_type === "patient").length;

  return (
    <div className="page">
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">Staff</span>
            <span className="name">{profile.full_name}</span>
            &nbsp; ({profile.shift})
          </div>
          <div>{donorCount} donors · {patientCount} patients this record</div>
        </div>
      )}

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-button ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "log" && (
        <div className="card">
          <h2>Log a donor or patient</h2>
          <p className="subtitle">Add anyone who comes in while you're on duty. It's saved to your own shift record right away.</p>
          {message && <p className="notice-text">{message}</p>}
          <form onSubmit={handleSubmit}>
            <label>Who came in</label>
            <select name="visitor_type" value={form.visitor_type} onChange={handleChange}>
              <option value="donor">Donor</option>
              <option value="patient">Patient</option>
            </select>

            <label>Full name</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required />

            <label>Blood type, optional</label>
            <input name="blood_type" placeholder="e.g. O+" value={form.blood_type} onChange={handleChange} />

            <label>Phone number, optional</label>
            <input name="phone_number" value={form.phone_number} onChange={handleChange} />

            <label>Where they came from, optional</label>
            <input name="from_location" placeholder="e.g. Gulberg, Lahore" value={form.from_location} onChange={handleChange} />

            <label>Notes, optional</label>
            <input name="notes" value={form.notes} onChange={handleChange} />

            <button type="submit">Save to my shift record</button>
          </form>
        </div>
      )}

      {tab === "record" && (
        <div className="card">
          <PrintHeader title="Staff shift record" subtitle={profile ? `${profile.full_name} — ${profile.shift}` : ""} />
          <div className="list-row-top">
            <h2>My shift record</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">
            {donorCount} donor{donorCount === 1 ? "" : "s"} and {patientCount} patient{patientCount === 1 ? "" : "s"} logged by you.
            When you go off duty, print or save this as a PDF for your records.
          </p>
          {entries.length === 0 && <p className="empty-state">Nothing logged yet.</p>}
          {entries.map((entry) => (
            <div className="list-row-stack" key={entry.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className={entry.visitor_type === "donor" ? "tag-hospital" : "tag-receiver"}>
                    {entry.visitor_type === "donor" ? "Donor" : "Patient"}
                  </span>
                  &nbsp; {entry.full_name} {entry.blood_type ? `· ${entry.blood_type}` : ""}
                </div>
                <span className="distance">{new Date(entry.logged_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {entry.from_location ? `From: ${entry.from_location}` : ""}
                {entry.phone_number ? ` · Phone: ${entry.phone_number}` : ""}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      <DataAssistantCard />
      <AIAssistantWidget role="staff" />
    </div>
  );
}

import React, { useEffect, useState } from "react";
import {
  getPendingHospitals, approveHospital, rejectHospital,
  getPendingDonors, clearDonor, flagDonor,
  verifyAuditChain, getAuditLog, getDeliveryStatus,
  getFlaggedRatings, getReengagementCandidates, draftReengagementMessage, sendReengagementMessage,
  getCampSuggestions, getReportSummary, downloadReportCsv,
} from "../services/api";
import ForecastPanel from "./ForecastPanel.jsx";
import { ImpactCard, AllocationCard, AccuracyCard, DocumentVerifier } from "./AIToolsPanel.jsx";
import TwoFactorSettings from "./TwoFactorSettings.jsx";

/** Admin: hospital licensing, donor medical clearance, tamper-evident audit trail, AI forecast, delivery status. */
export default function AdminGovernancePanel() {
  const [hospitals, setHospitals] = useState([]);
  const [donors, setDonors] = useState([]);
  const [audit, setAudit] = useState([]);
  const [chain, setChain] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [flaggedRatings, setFlaggedRatings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [campSuggestions, setCampSuggestions] = useState(null);
  const [report, setReport] = useState(null);

  function load() {
    getPendingHospitals().then((r) => setHospitals(r.data)).catch(() => {});
    getPendingDonors().then((r) => setDonors(r.data)).catch(() => {});
    getAuditLog().then((r) => setAudit(r.data)).catch(() => {});
    getDeliveryStatus().then((r) => setDelivery(r.data)).catch(() => {});
    getFlaggedRatings().then((r) => setFlaggedRatings(r.data)).catch(() => {});
    getReengagementCandidates().then((r) => setCandidates(r.data)).catch(() => {});
  }

  async function loadDraft(donorId) {
    try { const r = await draftReengagementMessage(donorId); setDrafts((prev) => ({ ...prev, [donorId]: r.data.draft_message })); }
    catch (e) {}
  }
  async function sendDraft(donorId) {
    const message = drafts[donorId];
    if (!message) return;
    try { await sendReengagementMessage(donorId, message); setDrafts((prev) => ({ ...prev, [donorId]: "Sent!" })); }
    catch (e) {}
  }
  useEffect(load, []);

  async function act(fn, ...args) { try { await fn(...args); } catch (e) {} load(); }

  return (
    <div>
      <TwoFactorSettings role="admin" />
      <ImpactCard />
      <ForecastPanel scope="platform" />
      <AccuracyCard />
      <AllocationCard />
      <DocumentVerifier />

      <div className="card">
        <h2>Hospital licence verification</h2>
        {hospitals.length === 0 && <p className="empty-state">No hospitals waiting for verification.</p>}
        {hospitals.map((h) => (
          <div className="list-row" key={h.id}>
            <div className="meta">{h.name} · licence {h.license_number} · {h.phone_number}</div>
            <div>
              <button onClick={() => act(approveHospital, h.id)}>Approve</button>{" "}
              <button className="btn-outline" onClick={() => act(rejectHospital, h.id)}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Donor medical clearance</h2>
        <p className="subtitle">Confirm eligibility after a medical provider's screening.</p>
        {donors.length === 0 && <p className="empty-state">No donors waiting for clearance.</p>}
        {donors.map((d) => (
          <div className="list-row" key={d.id}>
            <div className="meta"><span className="badge">{d.blood_type}</span> {d.full_name} · {d.phone_number}</div>
            <div>
              <button onClick={() => act(clearDonor, d.id)}>Clear</button>{" "}
              <button className="btn-outline" onClick={() => act(flagDonor, d.id, "Flagged by admin")}>Flag</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Tamper-evident audit trail</h2>
        <p className="subtitle">Every event is hash-chained; editing any past row breaks the chain.</p>
        <button onClick={() => verifyAuditChain().then((r) => setChain(r.data))}>Verify chain integrity</button>
        {chain && (
          <p className={chain.valid ? "notice-text" : "error-text"}>
            {chain.valid ? `Chain intact — ${chain.checked} events verified.` : `Chain BROKEN at event #${chain.broken_at_id}.`}
          </p>
        )}
        {audit.slice(0, 25).map((e) => (
          <div className="list-row" key={e.id}>
            <div className="meta">#{e.id} {e.event_type} · {e.actor_type || "system"} {e.actor_id || ""}</div>
            <span className="empty-state">{e.hash.slice(0, 12)}…</span>
          </div>
        ))}
      </div>

      {delivery && (
        <div className="card">
          <h2>Notification channels</h2>
          <p className="empty-state">
            SMS: {delivery.sms_configured ? "on" : "off"} · Email: {delivery.email_configured ? "on" : "off"} ·
            Push: {delivery.push_configured ? "on" : "off"} · AI (Groq): {delivery.ai_configured ? "on" : "off"}
          </p>
        </div>
      )}

      <div className="card">
        <h2>Flagged ratings</h2>
        <p className="subtitle">AI sentiment analysis surfaces likely complaints here, instead of them sitting unseen among five-star ratings.</p>
        {flaggedRatings.length === 0 && <p className="empty-state">No flagged ratings right now.</p>}
        {flaggedRatings.map((r) => (
          <div className="list-row-stack" key={r.id}>
            <div className="meta">
              <span className="badge">{r.stars}★</span> {r.direction === "donor_to_requester" ? "Donor → requester" : "Requester → donor"}
              &nbsp; <span className="error-text">{r.sentiment}</span>
            </div>
            <div className="empty-state">"{r.comment}"</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Donor re-engagement</h2>
        <p className="subtitle">Overdue or never-donated donors whose blood type is currently running short, platform-wide.</p>
        {candidates.length === 0 && <p className="empty-state">No re-engagement candidates right now.</p>}
        {candidates.map((c) => (
          <div className="list-row-stack" key={c.donor_id}>
            <div className="meta">
              <span className="badge">{c.blood_type}</span> {c.full_name}
              &nbsp; {c.never_donated ? "never donated" : `${c.days_since_last_donation} days since last donation`}
            </div>
            {!drafts[c.donor_id] && <button className="btn-outline" onClick={() => loadDraft(c.donor_id)}>Draft AI message</button>}
            {drafts[c.donor_id] && drafts[c.donor_id] !== "Sent!" && (
              <>
                <p className="notice-text">{drafts[c.donor_id]}</p>
                <button onClick={() => sendDraft(c.donor_id)}>Send it</button>
              </>
            )}
            {drafts[c.donor_id] === "Sent!" && <p className="notice-text">Sent!</p>}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>AI camp location suggestions</h2>
        <p className="subtitle">Where recent request demand is clustering — a starting point for planning the next donation camp.</p>
        <button onClick={() => getCampSuggestions().then((r) => setCampSuggestions(r.data)).catch(() => {})}>Suggest camp locations</button>
        {campSuggestions && (
          <>
            {campSuggestions.ai_commentary && <p className="notice-text">{campSuggestions.ai_commentary}</p>}
            {campSuggestions.clusters.length === 0 && <p className="empty-state">Not enough recent request data yet.</p>}
            {campSuggestions.clusters.map((c, i) => (
              <div className="list-row" key={i}>
                <div className="meta">~{c.approx_latitude}, {c.approx_longitude} · mostly {c.most_needed_type}</div>
                <span className="empty-state">{c.request_count} requests, {c.units_needed} units needed</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <h2>Reporting export</h2>
        <p className="subtitle">A summary by blood type, for a health authority or your own records.</p>
        <button onClick={() => getReportSummary({}).then((r) => setReport(r.data)).catch(() => {})}>Generate summary</button>{" "}
        <button className="btn-outline" onClick={() => downloadReportCsv({})}>Download CSV</button>
        {report && (
          <>
            <p className="empty-state">{report.total_requests} requests, {report.total_donations_all_time} donations all-time, generated {new Date(report.generated_at).toLocaleString()}</p>
            {report.by_blood_type.map((row) => (
              <div className="list-row" key={row.blood_type}>
                <div className="meta"><span className="badge">{row.blood_type}</span> {row.requests} requests</div>
                <span className="empty-state">{row.units_fulfilled}/{row.units_needed} units · {row.units_from_inventory} from stock · {row.fulfilled_requests} fulfilled</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

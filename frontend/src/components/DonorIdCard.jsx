import React from "react";
import PrintButton from "./PrintButton.jsx";

/**
 * A shareable/printable donor card: blood type, donation count, and a
 * QR code a camp coordinator can scan for a fast, accurate check-in.
 * The QR image itself is rendered by a public QR-image service from
 * the card's text (no server-side QR library needed); the data
 * encoded is plain identifying text, not a link to anything private.
 */
export default function DonorIdCard({ profile, donationCount }) {
  if (!profile) return null;

  const qrPayload = `LIFEFLOW-DONOR|id:${profile.id}|name:${profile.full_name}|type:${profile.blood_type}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="card donor-id-card-wrap">
      <h2>Your digital donor card</h2>
      <p className="subtitle">Show this at a donation camp for a quick check-in, or print it to keep in your wallet.</p>

      <div className="donor-id-card">
        <div className="donor-id-card-left">
          <div className="donor-id-card-brand">🩸 LifeFlow Donor</div>
          <div className="donor-id-card-name">{profile.full_name}</div>
          <div className="donor-id-card-type">{profile.blood_type}</div>
          <div className="donor-id-card-stats">
            {donationCount} donation{donationCount === 1 ? "" : "s"} · {profile.points} points
          </div>
          <div className="donor-id-card-id">Donor ID #{profile.id}</div>
        </div>
        <img className="donor-id-card-qr" src={qrImageUrl} alt="Donor check-in QR code" />
      </div>

      <PrintButton label="Print / Save card as PDF" />
    </div>
  );
}

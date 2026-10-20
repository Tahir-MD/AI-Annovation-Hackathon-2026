import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changeAdminCredentials } from "../services/api";
import { ShieldCheckIcon } from "../components/Icons.jsx";

export default function AdminChangeCredentials() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("The new password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("The new password must be at least 8 characters.");
      return;
    }
    if (newPassword === "Admin@123") {
      setErrorMessage("Please choose something other than the default password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changeAdminCredentials(currentPassword, newEmail, newFullName, newPassword);
      navigate("/admin/dashboard");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setErrorMessage(typeof detail === "string" ? detail : "Could not update your credentials. Check your current password and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "520px", margin: "0 auto" }}>
        <h2><ShieldCheckIcon size={22} color="#B01E28" /> Secure your admin account</h2>
        <p className="subtitle">
          You're signed in with the default admin credentials. Before you can see the rest of the
          dashboard, set your own username (email) and password.
        </p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Current password</label>
          <input
            type="password" placeholder="Default: Admin@123" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)} required
          />

          <label>Your name, optional</label>
          <input
            type="text" placeholder="Full name" value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
          />

          <label>New admin username (email)</label>
          <input
            type="email" placeholder="you@yourorganization.com" value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)} required
          />

          <label>New password</label>
          <input
            type="password" placeholder="At least 8 characters" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required
          />

          <label>Confirm new password</label>
          <input
            type="password" placeholder="Repeat the new password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save and continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

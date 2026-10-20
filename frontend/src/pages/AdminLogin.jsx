import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin, getMyAdminProfile, verify2FALogin } from "../services/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState("");

  async function afterLogin() {
    // First login on the default seeded account always lands here first,
    // never straight on the dashboard, until new credentials are set.
    const profile = await getMyAdminProfile();
    if (profile.data.must_change_password) {
      navigate("/admin/change-credentials");
    } else {
      navigate("/admin/dashboard");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await loginAdmin(email, password);
      if (response.data.requires_2fa) {
        setTempToken(response.data.temp_token);
        return;
      }
      localStorage.setItem("lifeflow_token", response.data.access_token);
      localStorage.setItem("lifeflow_role", "admin");
      await afterLogin();
    } catch (error) {
      setErrorMessage("Incorrect email or password.");
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await verify2FALogin(tempToken, code);
      localStorage.setItem("lifeflow_token", response.data.access_token);
      localStorage.setItem("lifeflow_role", "admin");
      await afterLogin();
    } catch (error) {
      setErrorMessage("Incorrect or expired code. Please try again.");
    }
  }

  if (tempToken) {
    return (
      <div className="page">
        <div className="card">
          <h2>Enter your 6-digit code</h2>
          <p className="subtitle">Open your authenticator app and enter the current code for this admin account.</p>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
          <form onSubmit={handleVerify}>
            <label>Authentication code</label>
            <input type="text" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button type="submit">Verify and log in</button>
          </form>
          <button className="btn-outline" style={{ marginTop: "10px" }} onClick={() => setTempToken(null)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Admin login</h2>
        <p className="subtitle">
          See every donor, hospital, and patient's full history in one place.
        </p>
        <p className="empty-state">
          First time here? The default admin account is <strong>admin@lifeflow.com</strong> / <strong>Admin@123</strong> — change this password after logging in.
        </p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <button type="submit">Log in</button>
        </form>
      </div>
    </div>
  );
}

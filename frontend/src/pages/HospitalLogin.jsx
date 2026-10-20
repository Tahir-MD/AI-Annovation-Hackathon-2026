import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginHospital, verify2FALogin } from "../services/api";

export default function HospitalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await loginHospital(email, password);
      if (response.data.requires_2fa) {
        setTempToken(response.data.temp_token);
        return;
      }
      localStorage.setItem("lifeflow_token", response.data.access_token);
      localStorage.setItem("lifeflow_role", "hospital");
      navigate("/hospital/dashboard");
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
      localStorage.setItem("lifeflow_role", "hospital");
      navigate("/hospital/dashboard");
    } catch (error) {
      setErrorMessage("Incorrect or expired code. Please try again.");
    }
  }

  if (tempToken) {
    return (
      <div className="page">
        <div className="card">
          <h2>Enter your 6-digit code</h2>
          <p className="subtitle">Open your authenticator app and enter the current code for this hospital account.</p>
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
        <h2>Hospital login</h2>
        <p className="subtitle">Log in to raise an emergency request and see matching donors.</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <button type="submit">Log in</button>
        </form>
      </div>
      <p className="empty-state">New here? <Link to="/hospital/register">Register your hospital</Link>.</p>
    </div>
  );
}

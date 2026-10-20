import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginDonor } from "../services/api";

export default function DonorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await loginDonor(email, password);
      localStorage.setItem("lifeflow_token", response.data.access_token);
      localStorage.setItem("lifeflow_role", "donor");
      navigate("/donor/dashboard");
    } catch (error) {
      setErrorMessage("Incorrect email or password.");
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Donor login</h2>
        <p className="subtitle">Log in to see open emergency requests near you.</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <button type="submit">Log in</button>
        </form>
      </div>
      <p className="empty-state">New here? <Link to="/donor/register">Create a donor account</Link>.</p>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerDonor } from "../services/api";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function DonorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    blood_type: "O+",
    phone_number: "",
    latitude: "",
    longitude: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      await registerDonor({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
      navigate("/donor/login");
    } catch (error) {
      const detail = error.response?.data?.detail || "Sign up failed. Please check your details.";
      setErrorMessage(detail);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Donor sign up</h2>
        <p className="subtitle">Your details are only shared with a hospital once you accept a request.</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Full name</label>
          <input name="full_name" placeholder="Full name" value={form.full_name} onChange={handleChange} required />

          <label>Email</label>
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />

          <label>Password</label>
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />

          <label>Blood type</label>
          <select name="blood_type" value={form.blood_type} onChange={handleChange}>
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <label>Phone number</label>
          <input name="phone_number" placeholder="Phone number" value={form.phone_number} onChange={handleChange} required />

          <label>Latitude</label>
          <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} required />

          <label>Longitude</label>
          <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} required />

          <button type="submit">Create account</button>
        </form>
      </div>
      <p className="empty-state">Already registered? <Link to="/donor/login">Log in here</Link>.</p>
    </div>
  );
}

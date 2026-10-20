import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerHospital } from "../services/api";

export default function HospitalRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    license_number: "",
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
      await registerHospital({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
      navigate("/hospital/login");
    } catch (error) {
      const detail = error.response?.data?.detail || "Sign up failed. Please check your details.";
      setErrorMessage(detail);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Hospital sign up</h2>
        <p className="subtitle">Reach nearby donors the moment an emergency request goes out.</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Hospital name</label>
          <input name="name" placeholder="Hospital name" value={form.name} onChange={handleChange} required />

          <label>Email</label>
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />

          <label>Password</label>
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />

          <label>License number</label>
          <input name="license_number" placeholder="License number" value={form.license_number} onChange={handleChange} required />

          <label>Phone number</label>
          <input name="phone_number" placeholder="Phone number" value={form.phone_number} onChange={handleChange} required />

          <label>Latitude</label>
          <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} required />

          <label>Longitude</label>
          <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} required />

          <button type="submit">Create account</button>
        </form>
      </div>
      <p className="empty-state">Already registered? <Link to="/hospital/login">Log in here</Link>.</p>
    </div>
  );
}

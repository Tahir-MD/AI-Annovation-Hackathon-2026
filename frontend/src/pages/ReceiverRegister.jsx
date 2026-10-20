import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerReceiver } from "../services/api";

export default function ReceiverRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    cnic_number: "",
    address: "",
    patient_name: "",
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
      await registerReceiver({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
      navigate("/receiver/login");
    } catch (error) {
      const detail = error.response?.data?.detail || "Sign up failed. Please check your details.";
      setErrorMessage(detail);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Patient sign up</h2>
        <p className="subtitle">For a patient or family member who needs blood directly, without going through a hospital request.</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <label>Your full name</label>
          <input name="full_name" placeholder="Your full name" value={form.full_name} onChange={handleChange} required />

          <label>Email</label>
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />

          <label>Password</label>
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />

          <label>Phone number</label>
          <input name="phone_number" placeholder="Phone number" value={form.phone_number} onChange={handleChange} required />

          <label>CNIC number</label>
          <input name="cnic_number" placeholder="CNIC number" value={form.cnic_number} onChange={handleChange} required />

          <label>Address</label>
          <input name="address" placeholder="Address" value={form.address} onChange={handleChange} required />

          <label>Patient name, if different from you</label>
          <input name="patient_name" placeholder="Patient name" value={form.patient_name} onChange={handleChange} />

          <label>Latitude</label>
          <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={handleChange} required />

          <label>Longitude</label>
          <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={handleChange} required />

          <button type="submit">Create account</button>
        </form>
      </div>
      <p className="empty-state">Already registered? <Link to="/receiver/login">Log in here</Link>.</p>
    </div>
  );
}

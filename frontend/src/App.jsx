import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NavigationBar from "./components/NavigationBar.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import OfflineBanner from "./components/OfflineBanner.jsx";
import Home from "./pages/Home.jsx";
import DonorRegister from "./pages/DonorRegister.jsx";
import DonorLogin from "./pages/DonorLogin.jsx";
import DonorDashboard from "./pages/DonorDashboard.jsx";
import ReceiverRegister from "./pages/ReceiverRegister.jsx";
import ReceiverLogin from "./pages/ReceiverLogin.jsx";
import ReceiverDashboard from "./pages/ReceiverDashboard.jsx";
import HospitalRegister from "./pages/HospitalRegister.jsx";
import HospitalLogin from "./pages/HospitalLogin.jsx";
import HospitalDashboard from "./pages/HospitalDashboard.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminChangeCredentials from "./pages/AdminChangeCredentials.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StaffLogin from "./pages/StaffLogin.jsx";
import StaffDashboard from "./pages/StaffDashboard.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <NavigationBar />
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/donor/register" element={<DonorRegister />} />
        <Route path="/donor/login" element={<DonorLogin />} />
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
        <Route path="/receiver/register" element={<ReceiverRegister />} />
        <Route path="/receiver/login" element={<ReceiverLogin />} />
        <Route path="/receiver/dashboard" element={<ReceiverDashboard />} />
        <Route path="/hospital/register" element={<HospitalRegister />} />
        <Route path="/hospital/login" element={<HospitalLogin />} />
        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/change-credentials" element={<AdminChangeCredentials />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
      </Routes>
      <SiteFooter />
    </BrowserRouter>
  );
}

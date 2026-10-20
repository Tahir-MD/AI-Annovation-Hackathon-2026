import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import PushToggle from "./PushToggle.jsx";
import LifeFlowLogo from "./LifeFlowLogo.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { logout } from "../services/api";
import {
  DropletIcon, UsersIcon, HospitalIcon, ShieldCheckIcon, HeartIcon,
  MapPinIcon, InfoIcon, LogInIcon, LogOutIcon,
} from "./Icons.jsx";

const ROLE_LABELS = {
  donor: "Donor",
  receiver: "Patient",
  hospital: "Hospital",
  admin: "Admin",
  staff: "Staff",
};

export default function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage, LANGUAGES } = useI18n();

  const token = localStorage.getItem("lifeflow_token");
  const role = localStorage.getItem("lifeflow_role");
  const isLoggedIn = Boolean(token && role);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="nav">
      <Link to="/" className="nav-logo">
        <LifeFlowLogo />
        LifeFlow
      </Link>

      {isLoggedIn ? (
        <div className="nav-links">
          <span className="role-tag">{ROLE_LABELS[role] || role}</span>
          <Link to={`/${role}/dashboard`}><UsersIcon size={15} /> {t("nav.dashboard")}</Link>
          {role === "donor" && <Link to="/leaderboard"><ShieldCheckIcon size={15} /> {t("nav.leaderboard")}</Link>}
          {role !== "admin" && role !== "staff" && <NotificationBell role={role} />}
          <PushToggle />
          <select
            className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language"
          >
            {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <button onClick={handleLogout} className="btn-outline" style={{ marginTop: 0, padding: "8px 16px" }}>
            <LogOutIcon size={15} /> {t("nav.logout")}
          </button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/#about"><InfoIcon size={15} /> {t("nav.about")}</Link>
          <Link to="/#contact"><MapPinIcon size={15} /> {t("nav.contact")}</Link>
          <Link to="/leaderboard"><ShieldCheckIcon size={15} /> {t("nav.leaderboard")}</Link>
          <span className="nav-divider" />
          <Link to="/donor/login" className="nav-login"><LogInIcon size={14} /> {t("nav.donorLogin")}</Link>
          <Link to="/receiver/login" className="nav-login"><LogInIcon size={14} /> {t("nav.patientLogin")}</Link>
          <Link to="/hospital/login" className="nav-login"><LogInIcon size={14} /> {t("nav.hospitalLogin")}</Link>
          <span className="nav-divider" />
          <Link to="/admin/login" className="admin-link">Admin</Link>
          <Link to="/staff/login" className="admin-link">Staff</Link>
          <select
            className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language"
          >
            {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

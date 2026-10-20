import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { DropletIcon, CheckCircleIcon } from "./Icons.jsx";

/**
 * Rendered once in App.jsx, below every route, so every page — not just
 * the home page — ends with the same contact details and quick links.
 * "About" and "Contact" always point back to the matching section on
 * the home page, wherever the person currently is.
 */
export default function SiteFooter() {
  const location = useLocation();
  const { t } = useI18n();
  const homeHash = (hash) => (location.pathname === "/" ? hash : `/${hash}`);

  return (
    <footer className="site-footer">
      <div className="page footer-inner">
        <div className="footer-brand">
          <span className="nav-logo"><DropletIcon size={20} color="#B01E28" /> LifeFlow</span>
          <p>{t("footer.tagline")}</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>{t("footer.involved")}</h4>
            <Link to="/donor/register">{t("start.donor")}</Link>
            <Link to="/receiver/register">Request blood</Link>
            <Link to="/hospital/register">{t("start.hospital")}</Link>
          </div>
          <div>
            <h4>{t("footer.explore")}</h4>
            <a href={homeHash("#about")}>{t("nav.about")}</a>
            <Link to="/leaderboard">{t("nav.leaderboard")}</Link>
            <a href={homeHash("#contact")}>Contact &amp; location</a>
          </div>
          <div>
            <h4>{t("footer.contact")}</h4>
            <span><CheckCircleIcon size={14} color="#0E3B36" /> support@lifeflow.app</span>
            <span><CheckCircleIcon size={14} color="#0E3B36" /> +92 300 1234567</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} LifeFlow Blood Network. All rights reserved.</div>
    </footer>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getPlatformStats } from "../services/api";
import AIAssistantWidget from "../components/AIAssistantWidget.jsx";
import {
  DropletIcon, HospitalIcon, ShieldCheckIcon, MapPinIcon, PhoneIcon, MailIcon,
  ClockIcon, UsersIcon, StarIcon, BoxIcon, BellRingIcon, HeartPulseIcon,
  CheckCircleIcon, ArrowRightIcon, HeartIcon,
} from "../components/Icons.jsx";

const FEATURES = [
  {
    icon: BoxIcon,
    title: "Hospital stock checked first",
    text: "Every request is matched against real hospital blood-bank inventory before any donor is ever contacted, so existing stock is used first and donors are only asked for the genuine shortfall.",
  },
  {
    icon: HeartPulseIcon,
    title: "Smart, life-saving matching",
    text: "Blood-type compatibility, distance, and donor eligibility are checked instantly, ranking the closest safe donors for every request.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Full detail before you decide",
    text: "Donors see the complete picture — patient, hospital, urgency, and units needed — before choosing to accept or decline a request.",
  },
  {
    icon: StarIcon,
    title: "Ratings you can trust",
    text: "Donors, hospitals, and patients rate each other after every donation, so reputations are earned and visible platform-wide.",
  },
  {
    icon: BellRingIcon,
    title: "Real-time notifications",
    text: "Instant alerts the moment a compatible request opens nearby, a donor accepts, or a hospital publishes a donation camp.",
  },
  {
    icon: UsersIcon,
    title: "Every history, saved",
    text: "Donors, hospitals, and patients each keep a permanent, private history tied to their account — log back in any time to see it.",
  },
];

const DONOR_STEPS = [
  { title: "Create your donor profile", text: "Register with your blood type and location in under a minute." },
  { title: "Get matched automatically", text: "We notify you the instant a compatible request opens nearby." },
  { title: "Review the full request", text: "See the patient, hospital, urgency, and units needed before you decide." },
  { title: "Accept, donate, get rated", text: "Confirm how many bags you're giving, donate, and earn points and a rating." },
];

const SEEKER_STEPS = [
  { title: "Register as a hospital or patient", text: "Hospitals verify with a license number; patients register with a CNIC." },
  { title: "We check hospital stock first", text: "Your request is matched against nearby blood-bank inventory automatically." },
  { title: "Only the shortfall goes to donors", text: "If stock isn't enough, compatible nearby donors are notified instantly." },
  { title: "Track it end-to-end", text: "See who's coming, rate the donor, and keep the record in your history forever." },
];

const GET_STARTED_OPTIONS = [
  {
    icon: DropletIcon,
    key: "start.donor",
    title: "Become a donor",
    text: "Register your blood type and location, then get matched to nearby requests automatically.",
    to: "/donor/register",
    cta: "Become a donor",
  },
  {
    icon: HeartIcon,
    key: "start.need",
    title: "I need blood",
    text: "Create a request for yourself or a loved one — we check hospital stock first, always.",
    to: "/receiver/register",
    cta: "I need blood",
  },
  {
    icon: HospitalIcon,
    key: "start.hospital",
    title: "Register your hospital",
    text: "Publish live inventory, post requests, and reach verified donors near your facility.",
    to: "/hospital/register",
    cta: "Register hospital",
  },
];

function StatBlock({ value, label }) {
  return (
    <div className="stat">
      <div className="figure">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export default function Home() {
  const [platformStats, setPlatformStats] = useState(null);
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    getPlatformStats()
      .then((response) => setPlatformStats(response.data))
      .catch(() => setPlatformStats(null));
  }, []);

  // Lets nav links like /#about or /#contact land the user right on that section.
  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    }
  }, [location.hash]);

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="hero-split">
        <div className="hero-hearts" aria-hidden="true">
          <HeartIcon size={26} color="#B01E28" filled />
          <HeartIcon size={16} color="#B01E28" filled />
          <HeartIcon size={20} color="#0E3B36" filled />
          <HeartIcon size={14} color="#B01E28" filled />
          <HeartIcon size={22} color="#0E3B36" filled />
        </div>
        <div className="page hero-split-inner">
          <div className="hero-copy">
            <span className="eyebrow"><DropletIcon size={15} /> {t("hero.eyebrow")}</span>
            <h1>{t("hero.title")}</h1>
            <p className="lede">{t("hero.lede")}</p>
            <div className="stat-row">
              <StatBlock value={platformStats ? platformStats.total_donors : "—"} label={t("stat.donors")} />
              <StatBlock value={platformStats ? platformStats.total_hospitals : "—"} label={t("stat.hospitals")} />
              <StatBlock value={platformStats ? platformStats.total_units_donated : "—"} label={t("stat.bags")} />
              <StatBlock
                value={platformStats && platformStats.average_platform_rating ? `${platformStats.average_platform_rating}★` : "New"}
                label={t("stat.rating")}
              />
            </div>
          </div>
          <div className="hero-media">
            <img
              className="hero-photo"
              src="https://images.unsplash.com/photo-1615461066159-fea0960485d5?auto=format&fit=crop&w=900&q=80"
              alt="A donor giving blood at a modern blood donation drive"
              loading="eager"
            />
            <div className="hero-photo-badge">
              <ShieldCheckIcon size={20} color="#0E3B36" />
              <div>
                <strong>Stock-checked</strong>
                <span>before every donor call-out</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- About ---------------- */}
      <section className="page section" id="about">
        <div className="about-grid">
          <img
            className="about-photo"
            src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=800&q=80"
            alt="Doctors and volunteers coordinating a blood donation drive"
          />
          <div>
            <span className="eyebrow"><HeartIcon size={15} filled /> About LifeFlow</span>
            <h2>{t("about.title")}</h2>
            <p className="section-lede">
              LifeFlow was built around a simple frustration: patients' families making dozens of
              phone calls while a hospital's own fridge already had the blood they needed. So every
              request here checks hospital inventory automatically first, and only turns to the
              donor network for a genuine shortfall.
            </p>
            <p className="section-lede">
              Donors, hospitals, and patients each keep a permanent history and a reputation built
              from real ratings — so trust on the platform is earned, not assumed.
            </p>
            <ul className="about-points">
              <li><CheckCircleIcon size={16} color="#0E3B36" /> Verified hospitals and CNIC-checked patients</li>
              <li><CheckCircleIcon size={16} color="#0E3B36" /> Real-time, distance-ranked donor matching</li>
              <li><CheckCircleIcon size={16} color="#0E3B36" /> Full history kept for every account, always</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- Get started (mid-page CTA) ---------------- */}
      <section className="section section-alt">
        <div className="page">
          <div className="section-head" style={{ textAlign: "center", margin: "0 auto 40px" }}>
            <span className="eyebrow"><HeartIcon size={15} filled /> Get started</span>
            <h2>{t("start.title")}</h2>
            <p className="section-lede">Registration takes under two minutes, for donors, patients, and hospitals alike.</p>
          </div>
          <div className="get-started-grid">
            {GET_STARTED_OPTIONS.map((option) => (
              <div className="get-started-card" key={option.title}>
                <div className="feature-icon"><option.icon size={26} color="#B01E28" /></div>
                <h3>{t(option.key)}</h3>
                <p>{option.text}</p>
                <Link to={option.to} className="btn">{t(option.key)} <ArrowRightIcon size={15} /></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="page section">
        <div className="section-head">
          <span className="eyebrow">Why LifeFlow</span>
          <h2>{t("why.title")}</h2>
          <p className="section-lede">A modern blood bank platform that connects donors, patients, and hospitals with one shared, transparent history.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon"><feature.icon size={24} color="#B01E28" /></div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="section section-alt">
        <div className="page">
          <div className="section-head">
            <span className="eyebrow">Guidance</span>
            <h2>{t("how.title")}</h2>
            <p className="section-lede">Two short journeys — whichever side of a donation you're on.</p>
          </div>
          <div className="steps-columns">
            <div className="steps-col">
              <h3 className="steps-col-title"><DropletIcon size={20} color="#B01E28" /> {t("how.donors")}</h3>
              <ol className="steps-list">
                {DONOR_STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="step-num">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="steps-col">
              <h3 className="steps-col-title"><HospitalIcon size={20} color="#0E3B36" /> {t("how.seekers")}</h3>
              <ol className="steps-list">
                {SEEKER_STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="step-num step-num-alt">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Gallery / trust ---------------- */}
      <section className="page section">
        <div className="section-head">
          <span className="eyebrow">Inside LifeFlow</span>
          <h2>A network you can see and trust</h2>
        </div>
        <div className="gallery-grid">
          <img src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=700&q=80" alt="Hospital blood bank refrigerator with labeled blood bags" />
          <img src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=700&q=80" alt="Medical staff preparing a donation" />
          <img src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=700&q=80" alt="Volunteer donor smiling after giving blood" />
        </div>
      </section>

      {/* ---------------- Ratings / testimonial ---------------- */}
      <section className="section section-alt">
        <div className="page rating-band">
          <div className="rating-band-score">
            <div className="rating-band-number">
              {platformStats && platformStats.average_platform_rating ? platformStats.average_platform_rating : "—"}
            </div>
            <div className="rating-band-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} size={18} color="#B01E28" filled={platformStats && platformStats.average_platform_rating >= n - 0.5} />
              ))}
            </div>
            <p>Average rating across every completed donation, given by donors, hospitals, and patients about each other.</p>
          </div>
          <blockquote className="rating-quote">
            “The stock check meant our patient's family didn't need a single donor call — the
            hospital already had what was needed on the shelf, and LifeFlow found it in seconds.”
            <footer>— A partner hospital coordinator</footer>
          </blockquote>
        </div>
      </section>

      {/* ---------------- Responsible AI ---------------- */}
      <section className="section section-alt" id="responsible-ai">
        <div className="page">
          <div className="section-head">
            <span className="eyebrow"><ShieldCheckIcon size={15} /> {t("ai.title")}</span>
            <h2>{t("ai.subtitle")}</h2>
          </div>
          <div className="feature-grid">
            <div className="feature-card"><h3>Human in the loop</h3><p>AI-filled requests are always shown for review before anything is sent. Nothing is auto-submitted.</p></div>
            <div className="feature-card"><h3>Not medical advice</h3><p>Assistants explain how LifeFlow works. They never diagnose, prescribe, or judge a donor's fitness.</p></div>
            <div className="feature-card"><h3>Explainable predictions</h3><p>Shortage forecasts and no-show estimates use transparent statistics, with accuracy measured against a baseline.</p></div>
            <div className="feature-card"><h3>Privacy first</h3><p>Assistants only see the signed-in person's own data. Document checks only suggest; a person makes the final call.</p></div>
            <div className="feature-card"><h3>Tamper-evident records</h3><p>Every key event is hash-chained in an audit log so any after-the-fact edit is detectable.</p></div>
            <div className="feature-card"><h3>Works offline &amp; by SMS</h3><p>Installable offline mode, plus a text-message interface for people without data or an app.</p></div>
          </div>
        </div>
      </section>

      {/* ---------------- Contact & location ---------------- */}
      <section className="page section" id="contact">
        <div className="section-head">
          <span className="eyebrow">Contact &amp; location</span>
          <h2>{t("contact.title")}</h2>
        </div>
        <div className="contact-grid">
          <div className="contact-card">
            <MapPinIcon size={22} color="#B01E28" />
            <h3>Head office</h3>
            <p>LifeFlow Blood Network<br />2nd Floor, Clifton Business Tower<br />Karachi, Sindh, Pakistan</p>
          </div>
          <div className="contact-card">
            <PhoneIcon size={22} color="#B01E28" />
            <h3>24/7 emergency line</h3>
            <p>+92 300 1234567<br />Available around the clock for urgent requests.</p>
          </div>
          <div className="contact-card">
            <MailIcon size={22} color="#B01E28" />
            <h3>Email support</h3>
            <p>support@lifeflow.app<br />Replies within one business day.</p>
          </div>
          <div className="contact-card">
            <ClockIcon size={22} color="#B01E28" />
            <h3>Support hours</h3>
            <p>Live chat: 8am – 10pm daily<br />Emergency matching: always on.</p>
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="section cta-band">
        <div className="page cta-band-inner">
          <div>
            <h2>Still have questions?</h2>
            <p>Reach the LifeFlow team any time, day or night, for urgent requests.</p>
          </div>
          <div className="hero-actions">
            <a href="#contact" className="btn">Contact us <ArrowRightIcon size={16} /></a>
            <a href="#about" className="btn btn-outline">Learn more</a>
          </div>
        </div>
      </section>

      {/* Footer is shared across every page — see components/SiteFooter.jsx */}
      <AIAssistantWidget role="guest" />
    </div>
  );
}

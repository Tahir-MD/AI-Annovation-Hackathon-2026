import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getPushStatus, subscribePush } from "../services/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Lets a signed-in person turn on real browser/PWA push notifications, when the server has VAPID keys configured. */
export default function PushToggle() {
  const { t } = useI18n();
  const [status, setStatus] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem("lifeflow_token"));

  useEffect(() => {
    if (!isLoggedIn) return;
    getPushStatus().then((r) => setStatus(r.data)).catch(() => {});
  }, [isLoggedIn]);

  async function enable() {
    if (!status || !status.configured || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(status.public_key),
      });
      const raw = subscription.toJSON();
      await subscribePush({ endpoint: raw.endpoint, p256dh_key: raw.keys.p256dh, auth_key: raw.keys.auth });
      setEnabled(true);
    } catch (error) {
      // Push isn't available in this browser/context -- silently ignore.
    }
  }

  if (!isLoggedIn || !status || !status.configured) return null;
  return (
    <button className="btn-outline nav-login" style={{ marginTop: 0, padding: "6px 12px" }} onClick={enable} disabled={enabled}>
      {enabled ? t("push.on") : t("push.enable")}
    </button>
  );
}

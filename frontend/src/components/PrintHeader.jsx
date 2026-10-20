import React from "react";

/**
 * Shown only when printing (see .print-only in index.css) -- gives
 * the printed page / PDF a proper title and a timestamp, since the
 * on-screen navigation and tabs are hidden when printing.
 */
export default function PrintHeader({ title, subtitle }) {
  return (
    <div className="print-only print-header">
      <div className="print-title">LifeFlow — {title}</div>
      {subtitle && <div className="print-meta">{subtitle}</div>}
      <div className="print-meta">Printed on {new Date().toLocaleString()}</div>
    </div>
  );
}

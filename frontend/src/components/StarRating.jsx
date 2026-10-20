import React, { useState } from "react";

export default function StarRating({ initialValue = 0, onSubmit, disabled = false }) {
  const [value, setValue] = useState(initialValue);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(disabled);

  function handlePick(star) {
    if (submitted) return;
    setValue(star);
  }

  function handleSubmit() {
    if (!value || submitted) return;
    onSubmit(value);
    setSubmitted(true);
  }

  return (
    <div>
      <div className="star-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            className={`star-btn ${star <= (hovered || value) ? "filled" : ""}`}
            onMouseEnter={() => !submitted && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handlePick(star)}
            disabled={submitted}
          >
            ★
          </button>
        ))}
      </div>
      {!submitted && (
        <button type="button" className="inline-btn btn-outline" onClick={handleSubmit} disabled={!value}>
          Submit rating
        </button>
      )}
      {submitted && <p className="notice-text">Thank you for the feedback.</p>}
    </div>
  );
}

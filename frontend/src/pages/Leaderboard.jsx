import React, { useEffect, useState } from "react";
import { getDonorLeaderboard } from "../services/api";

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    getDonorLeaderboard()
      .then((response) => setEntries(response.data))
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="page">
      <div className="card">
        <h2>Top donors</h2>
        <p className="subtitle">Ranked by points earned from bags donated across LifeFlow.</p>
        {entries.length === 0 && <p className="empty-state">No donors have earned points yet.</p>}
        <table className="simple-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Donor</th>
              <th>Blood type</th>
              <th>Donations</th>
              <th>Points</th>
              <th>Badge</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.donor_id}>
                <td>#{entry.rank}</td>
                <td>{entry.full_name}</td>
                <td><span className="badge">{entry.blood_type}</span></td>
                <td>{entry.total_donations}</td>
                <td>{entry.points}</td>
                <td><span className="badge-tier">{entry.badge_tier}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

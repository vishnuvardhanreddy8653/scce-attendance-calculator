import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, ChevronDown, ChevronUp, GraduationCap, CheckCircle2 } from 'lucide-react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function App() {
  const [hallTicket, setHallTicket] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hallTicket.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hallTicket: hallTicket.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch attendance');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Network error connecting to backend service.');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColorClass = (pct) => {
    if (pct >= 75) return 'badge-high';
    if (pct >= 65) return 'badge-mid';
    return 'badge-low';
  };

  const getProgressColor = (pct) => {
    if (pct >= 75) return '#10B981';
    if (pct >= 65) return '#F59E0B';
    return '#F43F5E';
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>SCCE ATTENDANCE</h1>
        <p>Sree Chaitanya College of Engineering Portal</p>
      </header>

      <main className="card">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-group">
            <label htmlFor="hallTicket">Hall Ticket Number</label>
            <div className="input-wrapper">
              <GraduationCap className="input-icon" size={20} />
              <input
                id="hallTicket"
                type="text"
                className="input-field"
                placeholder="23N01A7401"
                value={hallTicket}
                onChange={(e) => setHallTicket(e.target.value.toUpperCase())}
                maxLength={12}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} />
                Fetching Attendance...
              </>
            ) : (
              <>
                <Search size={18} />
                Check Attendance
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="error-banner" style={{ marginTop: '1.25rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </main>

      {result && (
        <section className="card result-card">
          <div className="result-header">
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>HALL TICKET</span>
              <div className="student-tag">{result.hallTicket}</div>
            </div>
            {result.cached && (
              <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#A5B4FC' }}>
                Cached
              </span>
            )}
          </div>

          <div>
            <div className="stat-label" style={{ textAlign: 'center' }}>Current Attendance</div>
            <div className={`percentage-badge ${getPercentageColorClass(result.summary.percentage)}`}>
              {result.summary.percentage}%
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(result.summary.percentage, 100)}%`,
                  backgroundColor: getProgressColor(result.summary.percentage)
                }}
              />
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">Present</div>
              <div className="stat-value" style={{ color: '#10B981' }}>{result.summary.present}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Classes</div>
              <div className="stat-value">{result.summary.total}</div>
            </div>
          </div>

          {result.days && result.days.length > 0 && (
            <div>
              <button
                className="details-toggle"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>Dailywise Attendance Breakdown</span>
                {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showDetails && (
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Present</th>
                      <th>Total</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.days.map((day, idx) => (
                      <tr key={idx}>
                        <td>{day.date}</td>
                        <td style={{ color: '#10B981' }}>{day.present}</td>
                        <td>{day.total}</td>
                        <td>{day.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <p className="disclaimer">
            Attendance is calculated from the attendance records available through the college portal.
          </p>
        </section>
      )}
    </div>
  );
}

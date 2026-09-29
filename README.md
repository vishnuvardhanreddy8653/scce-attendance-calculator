# SCCE Attendance Calculator

A lightweight web application that retrieves student attendance from the **Sree Chaitanya College of Engineering (SCCE)** parent portal and calculates overall attendance percentage.

---

## Architecture

```
React (Vite) [Frontend]
       │
       │  POST /api/attendance
       ▼
Node.js / Express [Backend]
       │
       │  Authenticated HTTP session (Cookie-based)
       ▼
SCCE Portal (scce.ac.in/parent12/)
       │
       │  HTML Dailywise Report pages
       ▼
Cheerio HTML Parser
       │
       ▼
Attendance Calculator
       │
       ▼
JSON Response → React UI
```

---

## Features

- Enter any SCCE Hall Ticket Number to retrieve attendance
- Calculates percentage from actual period-by-period attendance records
- Collapsible day-by-day breakdown table
- Color-coded attendance percentage (green ≥75%, amber 65–74%, red <65%)
- Animated progress bar
- In-memory server-side caching (5-minute TTL)
- Rate limiting (30 requests per IP per 15 minutes)
- No credentials or cookies stored or exposed

---

## Tech Stack

| Layer     | Technology               |
|-----------|--------------------------|
| Frontend  | React 18, Vite 5, CSS    |
| Backend   | Node.js, Express 4       |
| Parsing   | Cheerio                  |
| HTTP      | Axios                    |

---

## Local Setup

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
npm install
node server.js
# Runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3001 (proxies /api to backend)
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Default                   | Description                         |
|-----------------------|---------------------------|-------------------------------------|
| `PORT`                | `5000`                    | Port for the Express server         |
| `CORS_ALLOWED_ORIGIN` | `*`                       | Allowed CORS origin(s)              |

### Frontend (`frontend/.env`)

| Variable              | Default                   | Description                         |
|-----------------------|---------------------------|-------------------------------------|
| `VITE_API_BASE_URL`   | `''` (Vite proxy)         | Backend API URL (production)        |

---

## API

### `POST /api/attendance`

**Request:**
```json
{ "hallTicket": "23N01A7401" }
```

**Response:**
```json
{
  "success": true,
  "hallTicket": "23N01A7401",
  "summary": { "present": 174, "total": 288, "percentage": 60.42 },
  "days": [
    { "date": "2026-09-29", "present": 6, "total": 6, "percentage": 100 }
  ],
  "lastUpdated": "2026-09-29"
}
```

### `GET /health`

Returns server health status.

---

## How Attendance is Calculated

1. The app authenticates with the SCCE portal using the Hall Ticket Number
2. Available attendance dates are extracted from the `Dailywisereport.php` date dropdown
3. Each date is fetched individually and the HTML table is parsed
4. For each period row: `Cnctd = 1` means valid class, `Atnd = 1` means student was present
5. `Percentage = (Total Present / Total Valid Periods) × 100`

---

## Testing

```bash
cd backend
npm test
```

Runs 3 unit tests: HTML cleaner, table parser, and percentage calculation.

---

## Security

- Portal cookies are never exposed to the frontend
- Hall Ticket Numbers are not persisted
- Cookies are not logged
- Rate limiting prevents portal abuse
- Sessions are created fresh per request and discarded after use

---

## Limitations

- Attendance accuracy depends on the live SCCE portal being accessible
- If the portal HTML structure changes, the parser may need updating
- Some dates may fail to load due to portal connection instability (retry logic handles transient failures)

---

## Troubleshooting

| Error                                      | Cause / Fix                                   |
|--------------------------------------------|-----------------------------------------------|
| `Hall Ticket Number not found`             | Check spelling — must match portal format     |
| `Portal temporarily unavailable`           | SCCE portal may be down — try again later     |
| `Portal page layout changed`               | Parser may need update if SCCE changes HTML   |
| Backend returns 500                        | Check `node server.js` logs                   |
| Frontend can't reach backend               | Ensure backend is running on port 5000        |

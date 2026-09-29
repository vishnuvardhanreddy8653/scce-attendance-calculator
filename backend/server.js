const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { fetchStudentAttendance } = require('./services/scceService');

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ALLOWED_ORIGIN || '*';

// In-memory short-lived cache (TTL: 5 minutes)
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Basic Rate Limiting: max 30 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Hall Ticket input validation regex (e.g. 23N01A7401)
const HALL_TICKET_REGEX = /^[A-Za-z0-9]{8,12}$/;

app.post('/api/attendance', async (req, res) => {
  try {
    const { hallTicket } = req.body;

    if (!hallTicket || typeof hallTicket !== 'string' || !HALL_TICKET_REGEX.test(hallTicket.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Hall Ticket Number format. Example: 23N01A7401'
      });
    }

    const cleanHT = hallTicket.trim().toUpperCase();

    // Check cache
    const cached = cache.get(cleanHT);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        cached: true,
        ...cached.data
      });
    }

    const result = await fetchStudentAttendance(cleanHT);

    // Save to cache
    cache.set(cleanHT, {
      timestamp: Date.now(),
      data: result
    });

    return res.json({
      success: true,
      cached: false,
      ...result
    });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    if (error.message === 'INVALID_HALL_TICKET') {
      return res.status(404).json({
        success: false,
        message: 'Hall Ticket Number not found in SCCE portal.'
      });
    }
    if (error.message === 'PORTAL_STRUCTURE_ERROR') {
      return res.status(502).json({
        success: false,
        message: 'SCCE College portal page layout changed or temporarily unavailable.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance from college portal. Please try again later.'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`SCCE Attendance Backend running on port ${PORT}`);
  });
}

module.exports = app;

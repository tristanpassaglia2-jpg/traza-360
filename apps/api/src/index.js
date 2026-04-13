// apps/api/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./modules/auth/auth.routes');
const contactRoutes = require('./modules/contacts/contacts.routes');
const alertRoutes = require('./modules/alerts/alerts.routes');
const trackingRoutes = require('./modules/tracking/tracking.routes');
const evidenceRoutes = require('./modules/evidence/evidence.routes');
const reminderRoutes = require('./modules/reminders/reminders.routes');
const medicationRoutes = require('./modules/medications/medications.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscriptions.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const auditRoutes = require('./modules/audit/audit.routes');

const { errorHandler } = require('./common/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & middleware ──
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);

// ── Error handler ──
app.use(errorHandler);

// ── Start ──
app.listen(PORT, () => {
  console.log(`🛡️  Traza 360 API running on port ${PORT}`);
});

module.exports = app;

'use strict';

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Initialize database (creates tables + seeds data)
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3457;

// CORS — restrict to same-origin in production; allow cross-origin in dev
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || false,
  credentials: true
}));
app.use(express.json());

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 failed attempts per window
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'portfolio-os-default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true if serving over HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const metricRoutes = require('./routes/metrics');
const planRoutes = require('./routes/plans');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const digestRoutes = require('./routes/digest');

// Auth routes — public (no session required for login) + rate limited
app.use('/api/auth', authLimiter, authRoutes);

// All other /api routes require session auth
const { requireAuth } = require('./middleware/auth');
app.use('/api/companies', requireAuth, companyRoutes);
app.use('/api/companies/:id/metrics', requireAuth, metricRoutes);
app.use('/api/companies/:id/plans', requireAuth, planRoutes);
app.use('/api/alerts', requireAuth, alertRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/digest', requireAuth, digestRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// SPA catch-all — must be after API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`PortfolioOS backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base: http://localhost:${PORT}/api`);
});

module.exports = app;
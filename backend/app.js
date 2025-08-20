// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const userRoutes = require('./routes/user');

const app = express();

// On Render/behind proxies, ensure real IP for rate limiter & logs
app.set('trust proxy', 1);

// --- Security & parsing middleware ---
app.use(helmet({
  // Allow images/styles/scripts from anywhere by default; tighten later if you host web assets
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '1mb' }));

// CORS: allow configured origin in prod, any in test, localhost in dev
const allowOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*');
app.use(cors({
  origin: allowOrigin || undefined, // undefined => reflect request origin if not set
  credentials: false,
}));

// Logs only in dev/test locally (Render already aggregates)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('tiny'));
}

// Basic rate limiter: protect free tiers & deter abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // 60 req/min/IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/user', userRoutes);

// --- Health check (useful for Render) ---
app.get('/health', (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Centralized error handler (last)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
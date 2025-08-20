/**
 * Kitchen*IT API
 * - Express server with security middleware
 * - Mongo connection
 * - Routes for auth, recipes (Spoonacular proxy), and user data
 * - Ready for Render deployment
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const userRoutes = require('./routes/user');

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(morgan('tiny'));

// Basic rate limiter: protect free tiers & deter abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests / minute / IP
});
app.use('/api/', apiLimiter);

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/user', userRoutes);

// --- Health check (useful for Render) ---
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- DB connect + server start ---
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connect error:', err);
    process.exit(1);
  });

module.exports = app;
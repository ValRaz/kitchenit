require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 8080;
const { MONGO_URI, JWT_SECRET } = process.env;

// Fast sanity checks for critical envs
if (!MONGO_URI) {
  console.error('Missing MONGO_URI');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: 'kitchenit',
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');

    const server = http.createServer(app);
    server.listen(PORT, () => console.log(`API listening on :${PORT}`));

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down...`);
      server.close(() => console.log('HTTP server closed'));
      await mongoose.connection.close(false);
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
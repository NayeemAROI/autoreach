#!/usr/bin/env node
// Standalone worker process — can run separately from the main server
// Usage: node worker.js

require('dotenv').config();
const logger = require('./utils/logger');

logger.info('🔧 Starting standalone worker...');

// Initialize database (runs migrations)
require('./db/database');

// Import and start the engine (which starts the job queue)
const engine = require('./services/engine');
engine.start();

logger.info('🔧 Worker is processing jobs');

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🔧 Worker shutting down...');
  engine.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🔧 Worker shutting down...');
  engine.stop();
  process.exit(0);
});

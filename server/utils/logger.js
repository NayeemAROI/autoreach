// Structured logger with levels, timestamps, and context
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2;

const colors = {
  error: '\x1b[31m',   // red
  warn: '\x1b[33m',    // yellow
  info: '\x1b[36m',    // cyan
  debug: '\x1b[90m',   // gray
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function formatTime() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > currentLevel) return;

  const color = colors[level] || colors.reset;
  const prefix = `${colors.bold}${color}[${level.toUpperCase()}]${colors.reset}`;
  const ts = `${colors.debug}${formatTime()}${colors.reset}`;
  const metaStr = Object.keys(meta).length > 0 ? ` ${colors.debug}${JSON.stringify(meta)}${colors.reset}` : '';

  console.log(`${ts} ${prefix} ${message}${metaStr}`);
}

const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),

  // Express request logger middleware
  requestLogger: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const lvl = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      log(lvl, `${req.method} ${req.originalUrl} ${status}`, { duration: `${duration}ms`, ip: req.ip });
    });
    next();
  }
};

module.exports = logger;

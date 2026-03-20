module.exports = {
  apps: [{
    name: 'autoreach',
    script: './server/index.js',
    cwd: '/var/www/autoreach',
    instances: 1,               // SQLite needs single instance
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Logging
    error_file: '/var/log/autoreach/error.log',
    out_file: '/var/log/autoreach/output.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};

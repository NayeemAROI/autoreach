const express = require('express');
const cors = require('cors');
const http = require('http');
const extBridge = require('./services/linkedinBridge');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));

// Initialize WebSocket Bridge
extBridge.initialize(server);

// Initialize Campaign Execution Engine
const engine = require('./services/engine');
engine.start();

// Initialize Lead Verifier
const verifier = require('./services/leadVerifier');
verifier.initialize();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    extensionConnected: extBridge.isConnected(),
    hasLinkedInSession: extBridge.getStatus().hasSession
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Automation Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Bridge listening for extension on ws://localhost:${PORT}`);
  console.log(`📊 API endpoints ready\n`);
});

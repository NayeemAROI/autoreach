const express = require('express');
const router = express.Router();
const bridge = require('../services/linkedinBridge');
const { requireAuth } = require('../middleware/auth');

router.get('/status', requireAuth, (req, res) => {
  try {
    // For now we assume a single session for the entire application bridging
    // Later this will be scoped by req.user.id
    const status = {
      connected: !!(bridge.session && bridge.session.li_at && bridge.session.JSESSIONID),
      connectedAt: bridge.session ? bridge.session.connectedAt : null,
      profileName: 'LinkedIn Profile' // Would extract from backend DB later
    };

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

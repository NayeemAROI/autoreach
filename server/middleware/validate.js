// Input validation middleware for key routes
// Lightweight — no external deps (no Zod/Joi needed for this scale)

function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${field} must be a number`);
        }
        if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

// Pre-built schemas for common routes
const schemas = {
  register: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', minLength: 6, maxLength: 128 },
  },
  login: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string' },
  },
  createCampaign: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
  },
  createLead: {
    firstName: { required: true, type: 'string', minLength: 1 },
    lastName: { required: true, type: 'string', minLength: 1 },
  },
  changePlan: {
    planId: { required: true, type: 'string', enum: ['free', 'pro', 'business'] },
  }
};

module.exports = { validateBody, schemas };

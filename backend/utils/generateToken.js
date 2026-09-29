const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is not configured.');
  }
  return secret.trim();
};

const generateToken = (id, role) => {
  const secret = getJwtSecret();
  return jwt.sign(
    { id, role },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

module.exports = generateToken;
module.exports.getJwtSecret = getJwtSecret;

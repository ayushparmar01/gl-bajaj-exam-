const crypto = require('crypto');

const generateOTP = () => {
  // Use crypto.randomInt for cryptographically secure 6-digit OTP generation
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = generateOTP;

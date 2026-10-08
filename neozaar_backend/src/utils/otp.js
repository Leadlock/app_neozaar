// Use Redis or DB in production. This is in-memory for demo/POC.
const otpStore = {}; // { email: { otp, createdAt, expiresAt, timeoutId } }

function generateOtp() {
  // Generates a 6-digit string
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOtp(email, otp, expiresInMs = 10 * 60 * 1000) {
  const key = email;
  // Clear any previous timeout for this key to prevent multiple timeouts
  if (otpStore[key] && otpStore[key].timeoutId) {
    clearTimeout(otpStore[key].timeoutId);
  }
  const expiresAt = Date.now() + expiresInMs;
  const timeoutId = setTimeout(() => {
    delete otpStore[key];
  }, expiresInMs);
  otpStore[key] = { otp, createdAt: Date.now(), expiresAt, timeoutId };
}

function verifyOtp(email, otp) {
  const key = email;
  const record = otpStore[key];
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    delete otpStore[key];
    return false; // OTP expired
  }
  const isValid = record.otp === otp;
  if (isValid) {
    clearTimeout(record.timeoutId);
    delete otpStore[key]; // OTP is one-time use
  }
  return isValid;
}

module.exports = {
  generateOtp,
  storeOtp,
  verifyOtp
};

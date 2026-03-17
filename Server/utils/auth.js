const jwt = require("jsonwebtoken");

const DEFAULT_SESSION_MAX_AGE_MS = 30 * 60 * 1000;

function getSessionMaxAgeMs() {
  const value = Number(process.env.SESSION_MAX_AGE_MS);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return DEFAULT_SESSION_MAX_AGE_MS;
}

function getJwtExpiry() {
  return process.env.JWT_EXPIRES_IN || `${Math.floor(getSessionMaxAgeMs() / 1000)}s`;
}

function getTokenPayload(user) {
  return {
    id: user._id,
    role: user.role,
    email: user.email,
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(getTokenPayload(user), secret, { expiresIn: getJwtExpiry() });
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: getSessionMaxAgeMs(),
  });
}

function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
}

module.exports = {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  getSessionMaxAgeMs,
};

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { signToken, setAuthCookie } = require("../utils/auth");

async function getUserFromRequest(req) {
  const tokenFromCookie = req.cookies?.token;
  const tokenFromHeader = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return { user: null, tokenFromCookie: null };
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.id).select("-passwordHash");

  return { user, tokenFromCookie };
}

async function requireAuth(req, res, next) {
  try {
    const { user, tokenFromCookie } = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;

    // Rolling session: refresh cookie for active users, expire for inactive users.
    if (tokenFromCookie) {
      const refreshedToken = signToken(user);
      setAuthCookie(res, refreshedToken);
    }

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}

async function requireGuest(req, res, next) {
  try {
    const { user } = await getUserFromRequest(req);
    if (user) {
      return res.status(403).json({ error: "Already authenticated. Please logout first." });
    }
    return next();
  } catch (error) {
    // Invalid/expired tokens are treated as guest.
    return next();
  }
}

module.exports = {
  requireAuth,
  requireRole,
  requireGuest,
};

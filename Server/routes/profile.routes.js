const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { requireAuth } = require("../middlewares/auth");
const { signToken, setAuthCookie } = require("../utils/auth");

const router = express.Router();

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    college: user.college,
    mentor: user.mentor || null,
    avatarUrl: user.avatarUrl || "",
  };
}

// GET /api/profile - return current user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    return res.json({ user: req.user });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/profile - update account settings
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { name, email, college, password, avatar } = req.body;

    if (name) user.name = name;
    if (college) user.college = college;

    // Accept avatar as a data URL or external URL
    if (avatar && typeof avatar === "string") {
      user.avatarUrl = avatar;
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ error: "Email already in use" });
      }
      user.email = email.toLowerCase();
    }

    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const hash = await bcrypt.hash(password, 10);
      user.passwordHash = hash;
    }

    await user.save();

    // Refresh token and cookie to ensure payload (email) is up-to-date
    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

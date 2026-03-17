const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { requireAuth, requireGuest } = require("../middlewares/auth");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/auth");

const router = express.Router();

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    college: user.college,
    mentor: user.mentor || null,
  };
}

router.post("/register", requireGuest, async (req, res, next) => {
  try {
    const { name, email, password, role, college, mentor } = req.body;

    if (!name || !email || !password || !role || !college) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    if (!["student", "mentor"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    let mentorId = null;
    if (role === "student" && mentor) {
      const mentorUser = await User.findOne({ _id: mentor, role: "mentor" });
      if (!mentorUser) {
        return res.status(400).json({ error: "Selected mentor does not exist" });
      }
      mentorId = mentorUser._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      college,
      mentor: role === "student" ? mentorId : null,
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", requireGuest, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

router.post("/logout", async (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.get("/mentors", async (req, res, next) => {
  try {
    const college = req.query.college;

    const query = {
      role: "mentor",
      ...(college ? { college } : {}),
    };

    const mentors = await User.find(query)
      .select("_id name email college")
      .sort({ name: 1 });

    return res.json({ mentors });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

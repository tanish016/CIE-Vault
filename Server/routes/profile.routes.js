const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const User = require("../models/User");
const { requireAuth } = require("../middlewares/auth");
const { signToken, setAuthCookie } = require("../utils/auth");

const router = express.Router();

// Prepare uploads directory for avatars
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const name = `${req.user._id}_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

// POST /api/profile/password - change password (requires current password)
router.post("/password", requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "Missing parameters" });
    if (typeof newPassword !== "string" || newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(oldPassword, user.passwordHash || "");
    if (!ok) return res.status(403).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    await user.save();

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// POST /api/profile/avatar - upload avatar image (multipart/form-data)
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If previous avatar was stored locally under /uploads, attempt to delete it
    try {
      if (user.avatarUrl && typeof user.avatarUrl === 'string' && user.avatarUrl.startsWith('/uploads/')) {
        const prevPath = path.join(__dirname, '..', user.avatarUrl);
        if (fs.existsSync(prevPath)) {
          fs.unlinkSync(prevPath);
        }
      }
    } catch (e) {
      // non-fatal; log and continue
      console.warn('Failed to remove previous avatar', e);
    }

    // Save new avatar URL (served at /uploads/avatars/<filename>)
    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    // Return sanitized user
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/profile/avatar - remove stored avatar file and clear avatarUrl
router.delete('/avatar', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If avatarUrl points to a local /uploads file, delete it
    try {
      if (user.avatarUrl && typeof user.avatarUrl === 'string' && user.avatarUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', user.avatarUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      console.warn('Failed to remove avatar during deletion', err);
    }

    // Clear avatarUrl and save
    user.avatarUrl = "";
    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

  module.exports = router;

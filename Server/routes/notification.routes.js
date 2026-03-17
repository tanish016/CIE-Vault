const express = require("express");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// Get notifications for current user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const notes = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    return res.json({ notifications: notes });
  } catch (err) {
    return next(err);
  }
});

// Mark a notification as read
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const note = await Notification.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (String(note.user) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    note.read = true;
    await note.save();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// Mark all notifications for current user as read
router.patch('/mark-all-read', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// Clear all notifications history for current user
router.delete('/clear', requireAuth, async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

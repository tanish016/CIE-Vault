const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const Copyright = require("../models/Copyright");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { encryptBuffer, decryptBuffer } = require("../utils/file-encryption");

const router = express.Router();

// Per-field size limits
const MAX_RECEIPT_BYTES = 500 * 1024; // 500 KB
const MAX_REPORT_BYTES = 2 * 1024 * 1024; // 2 MB

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    return cb(null, true);
  },
  // Set a reasonable global cap (max of per-field limits). We'll also enforce
  // per-field sizes inside the route handler to provide precise error messages.
  limits: {
    fileSize: MAX_REPORT_BYTES,
  },
});

const PRIVATE_UPLOADS_DIR = path.join(__dirname, "..", "uploads", "private");

function isAuthorizedForFileAccess(copyrightDoc, user) {
  const isOwnerStudent = user.role === "student" && String(copyrightDoc.student) === String(user._id);
  const isAssignedMentor =
    user.role === "mentor" &&
    copyrightDoc.mentor &&
    String(copyrightDoc.mentor) === String(user._id);

  const isGranted = Array.isArray(copyrightDoc.accessGranted)
    ? copyrightDoc.accessGranted.some((id) => String(id) === String(user._id))
    : false;

  return isOwnerStudent || isAssignedMentor || isGranted;
}

function resolveLegacyFilePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("/uploads/")) {
    return null;
  }

  const fileName = path.basename(fileUrl);
  return path.join(__dirname, "..", "uploads", fileName);
}

function mapCopyright(doc) {
  return {
    _id: doc._id,
    title: doc.title,
    filingNumber: doc.filingNumber,
    abstract: doc.abstract,
    college: doc.college,
    status: doc.status,
    portalLogin: doc.portalLogin,
    portalPassword: doc.portalPassword,
    fileUrl: doc.fileName ? `/api/copyrights/${doc._id}/file` : "",
    fileName: doc.fileName,
    extractedTitle: doc.extractedTitle,
    extractedFilingNumber: doc.extractedFilingNumber,
    createdAt: doc.createdAt,
    student: doc.student,
    mentor: doc.mentor,
    isPublic: doc.isPublic || false,
    documentType: doc.documentType || "copyright",
  };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === "student") {
      const copyrights = await Copyright.find({ student: req.user._id })
        .populate("mentor", "name email college")
        .sort({ createdAt: -1 });

      return res.json({ copyrights: copyrights.map(mapCopyright) });
    }

    const copyrights = await Copyright.find({ mentor: req.user._id })
      .populate("student", "name email college")
      .populate("mentor", "name email college")
      .sort({ createdAt: -1 });

    return res.json({ copyrights: copyrights.map(mapCopyright) });
  } catch (error) {
    return next(error);
  }
});

// Accept two files: 'file' (main PDF) and optional 'report' (project report PDF)
router.post(
  "/",
  requireAuth,
  requireRole("student"),
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "report", maxCount: 1 },
  ]),
  async (req, res, next) => {
  try {
    const { title, abstract, college, mentorId, portalLogin, portalPassword } = req.body;

    if (!title || !abstract || !college) {
      return res.status(400).json({ error: "Title, abstract, and college are required" });
    }

    const mainFile = req.files && req.files.file && req.files.file[0];
    const reportFile = req.files && req.files.report && req.files.report[0];

    if (!mainFile) {
      return res.status(400).json({ error: "PDF receipt is required" });
    }

    // Require report file as well
    if (!reportFile) {
      return res.status(400).json({ error: "Project report PDF is required" });
    }

    // Enforce per-file size limits (multer's global limit is the max of these)
    if (mainFile.size > MAX_RECEIPT_BYTES) {
      return res.status(400).json({ error: "The file is greater than 500 KB" });
    }

    if (reportFile.size > MAX_REPORT_BYTES) {
      return res.status(400).json({ error: "Project report must be 2 MB or smaller" });
    }

    const assignedMentorId = mentorId || req.user.mentor;
    let mentor = null;

    if (assignedMentorId) {
      mentor = await User.findOne({ _id: assignedMentorId, role: "mentor" });
      if (!mentor) {
        return res.status(400).json({ error: "Invalid mentor selected" });
      }
    }

    await fs.mkdir(PRIVATE_UPLOADS_DIR, { recursive: true });

    // Encrypt and store main file
    const { encrypted, ivHex, authTagHex } = encryptBuffer(mainFile.buffer);
    const storageFileName = `${Date.now()}-${crypto.randomUUID()}.bin`;
    const encryptedFilePath = path.join(PRIVATE_UPLOADS_DIR, storageFileName);
    await fs.writeFile(encryptedFilePath, encrypted);

    // If a report file was uploaded, encrypt and store it as well
    let reportStorageFileName = "";
    let reportIv = "";
    let reportAuthTag = "";
    if (reportFile) {
      const r = encryptBuffer(reportFile.buffer);
      reportStorageFileName = `${Date.now()}-${crypto.randomUUID()}-report.bin`;
      const reportPath = path.join(PRIVATE_UPLOADS_DIR, reportStorageFileName);
      await fs.writeFile(reportPath, r.encrypted);
      reportIv = r.ivHex;
      reportAuthTag = r.authTagHex;
    }

    const documentType = (req.body.documentType && ["copyright", "research"].includes(req.body.documentType)) ? req.body.documentType : "copyright";

    const copyrightDoc = await Copyright.create({
      student: req.user._id,
      mentor: mentor ? mentor._id : null,
      title,
      filingNumber: "",
      abstract,
      college,
      status: "pending",
      portalLogin: portalLogin || "",
      portalPassword: portalPassword || "",
      fileUrl: "",
      fileName: mainFile.originalname,
      storageFileName,
      fileIv: ivHex,
      fileAuthTag: authTagHex,
      reportFileName: reportFile ? reportFile.originalname : "",
      reportStorageFileName: reportStorageFileName,
      reportFileIv: reportIv,
  reportFileAuthTag: reportAuthTag,
  documentType,
      isEncrypted: true,
      extractedTitle: title,
      extractedFilingNumber: "",
    });

    const populated = await Copyright.findById(copyrightDoc._id)
      .populate("student", "name email college")
      .populate("mentor", "name email college");

    // Notify assigned mentor that a student created a new request.
    try {
      if (mentor?._id) {
        await Notification.create({
          user: mentor._id,
          type: "request",
          data: {
            copyrightId: String(copyrightDoc._id),
            studentName: req.user.name || "Student",
            title,
            message: `A new message from ${req.user.name || "Student"}`,
          },
        });
      }
    } catch (nerr) {
      console.error("Failed to create request notification", nerr);
    }

    return res.status(201).json({ copyright: mapCopyright(populated) });
  } catch (error) {
    if (error.message === "Only PDF files are allowed") {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

router.get("/:id/file", requireAuth, async (req, res, next) => {
  try {
    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    if (!isAuthorizedForFileAccess(copyrightDoc, req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const safeName = (copyrightDoc.fileName || "document.pdf").replace(/[^a-zA-Z0-9._ -]/g, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName || "document.pdf"}"`);

    if (copyrightDoc.isEncrypted && copyrightDoc.storageFileName && copyrightDoc.fileIv && copyrightDoc.fileAuthTag) {
      const encryptedPath = path.join(PRIVATE_UPLOADS_DIR, path.basename(copyrightDoc.storageFileName));
      const encryptedBuffer = await fs.readFile(encryptedPath);
      const plainBuffer = decryptBuffer(encryptedBuffer, copyrightDoc.fileIv, copyrightDoc.fileAuthTag);
      return res.send(plainBuffer);
    }

    // Backward compatibility: allow secure streaming for legacy unencrypted files.
    const legacyPath = resolveLegacyFilePath(copyrightDoc.fileUrl);
    if (legacyPath) {
      const plainBuffer = await fs.readFile(legacyPath);
      return res.send(plainBuffer);
    }

    return res.status(404).json({ error: "File not found" });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", requireAuth, requireRole("mentor"), async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    if (!copyrightDoc.mentor || String(copyrightDoc.mentor) !== String(req.user._id)) {
      return res.status(403).json({ error: "Only assigned mentor can update status" });
    }

    copyrightDoc.status = status;
    // If a document is not approved, ensure it's not marked public.
    if (copyrightDoc.status !== 'approved') {
      copyrightDoc.isPublic = false;
    }

    await copyrightDoc.save();

    // Notify the student about the status change
    try {
      if (copyrightDoc && copyrightDoc.student) {
        await Notification.create({
          user: copyrightDoc.student,
          type: "status",
          data: {
            copyrightId: String(copyrightDoc._id),
            status: copyrightDoc.status,
            mentorName: req.user.name || "Mentor",
          },
        });
      }
    } catch (nerr) {
      console.error("Failed to create status notification", nerr);
    }

    return res.json({ ok: true, status: copyrightDoc.status });
  } catch (error) {
    return next(error);
  }
});

// Allow student to mark an approved document as public and set document type
router.put("/:id/publish", requireAuth, async (req, res, next) => {
  try {
    const { isPublic, documentType } = req.body;

    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Only the owning student may change publish settings
    if (String(copyrightDoc.student) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Document must be approved before it can be made public
    if (copyrightDoc.status !== "approved") {
      return res.status(400).json({ error: "Only approved documents can be published" });
    }

    if (typeof isPublic === "boolean") {
      copyrightDoc.isPublic = isPublic;
    }

    if (documentType && ["copyright", "research"].includes(documentType)) {
      copyrightDoc.documentType = documentType;
    }

    await copyrightDoc.save();

    // Optionally notify mentors or other users when published
    try {
      if (copyrightDoc && copyrightDoc.mentor) {
        await Notification.create({
          user: copyrightDoc.mentor,
          type: "published",
          data: {
            copyrightId: String(copyrightDoc._id),
            studentName: req.user.name || "Student",
            isPublic: copyrightDoc.isPublic,
          },
        });
      }
    } catch (nerr) {
      console.error("Failed to create publish notification", nerr);
    }

    const populated = await Copyright.findById(copyrightDoc._id)
      .populate("student", "name email college")
      .populate("mentor", "name email college");

    return res.json({ copyright: mapCopyright(populated) });
  } catch (error) {
    return next(error);
  }
});

// Allow owning student to update some details (title, abstract, documentType, isPublic)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { title, abstract, documentType, isPublic } = req.body;

    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) return res.status(404).json({ error: "Record not found" });

    // Only the owning student may update their filing details
    if (String(copyrightDoc.student) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (title && typeof title === 'string') copyrightDoc.title = title;
    if (abstract && typeof abstract === 'string') copyrightDoc.abstract = abstract;
    if (documentType && ["copyright", "research"].includes(documentType)) copyrightDoc.documentType = documentType;

    // Allow owner to unpublish via this endpoint as well
    if (typeof isPublic === 'boolean') {
      // Only allow publish/unpublish if the document is approved
      if (isPublic && copyrightDoc.status !== 'approved') {
        return res.status(400).json({ error: 'Only approved documents can be published' });
      }
      copyrightDoc.isPublic = !!isPublic;
    }

    await copyrightDoc.save();

    const populated = await Copyright.findById(copyrightDoc._id)
      .populate("student", "name email college")
      .populate("mentor", "name email college");

    return res.json({ ok: true, copyright: mapCopyright(populated) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    const isOwnerStudent = req.user.role === "student" && String(copyrightDoc.student) === String(req.user._id);
    const isMentor = req.user.role === "mentor";

    if (!isOwnerStudent && !isMentor) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const comments = await Comment.find({ copyright: copyrightDoc._id })
      .populate("mentor", "name email college")
      .sort({ createdAt: -1 });

    return res.json({ comments });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/comments", requireAuth, requireRole("mentor"), async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    const comment = await Comment.create({
      copyright: copyrightDoc._id,
      mentor: req.user._id,
      text: text.trim(),
    });

    const populated = await Comment.findById(comment._id).populate("mentor", "name email college");

    // Create a notification for the student who owns the copyright
    try {
      const copyrightDoc = await Copyright.findById(req.params.id);
      if (copyrightDoc && copyrightDoc.student) {
        await Notification.create({
          user: copyrightDoc.student,
          type: "comment",
          data: {
            copyrightId: String(copyrightDoc._id),
            commentId: String(populated._id),
            text: populated.text,
            mentorName: populated.mentor?.name || "Mentor",
          },
        });
      }
    } catch (nerr) {
      // don't fail the request if notification creation fails
      console.error("Failed to create notification", nerr);
    }

    return res.status(201).json({ comment: populated });
  } catch (error) {
    return next(error);
  }
});

// Request access to download/view the PDF. Notifies the owning student.
router.post("/:id/request-access", requireAuth, async (req, res, next) => {
  try {
    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) return res.status(404).json({ error: "Record not found" });

    // Owners and mentors don't request access
    if (String(copyrightDoc.student) === String(req.user._id) || String(copyrightDoc.mentor) === String(req.user._id)) {
      return res.status(400).json({ error: "Already authorized" });
    }

    // Don't duplicate requests
  const alreadyRequested = Array.isArray(copyrightDoc.accessRequests) && copyrightDoc.accessRequests.some((id) => String(id) === String(req.user._id));
    if (alreadyRequested) return res.status(400).json({ error: "Access already requested" });

    copyrightDoc.accessRequests = copyrightDoc.accessRequests || [];
    copyrightDoc.accessRequests.push(req.user._id);
    await copyrightDoc.save();

    // Notify the owning student (include document title for clarity)
    try {
      await Notification.create({
        user: copyrightDoc.student,
        type: "access_request",
        data: {
          copyrightId: String(copyrightDoc._id),
          title: copyrightDoc.title || "Document",
          requesterId: String(req.user._id),
          requesterName: req.user.name || "User",
        },
      });
    } catch (nerr) {
      console.error("Failed to create access request notification", nerr);
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// Cancel a previously made access request by the requester
router.delete("/:id/request-access", requireAuth, async (req, res, next) => {
  try {
    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) return res.status(404).json({ error: "Record not found" });

    const requesterId = String(req.user._id);

    const hadRequest = Array.isArray(copyrightDoc.accessRequests) && copyrightDoc.accessRequests.some((id) => String(id) === requesterId);
    if (!hadRequest) return res.status(400).json({ error: "No existing access request found" });

    copyrightDoc.accessRequests = (copyrightDoc.accessRequests || []).filter((id) => String(id) !== requesterId);
    await copyrightDoc.save();

    // Optionally notify the owning student that the requester cancelled the request
    try {
      await Notification.create({
        user: copyrightDoc.student,
        type: "request_cancelled",
        data: {
          copyrightId: String(copyrightDoc._id),
          requesterId: requesterId,
          requesterName: req.user.name || "User",
        },
      });
    } catch (nerr) {
      console.error("Failed to create cancel notification", nerr);
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// Owner can list pending access requests
router.get("/:id/requests", requireAuth, async (req, res, next) => {
  try {
    const copyrightDoc = await Copyright.findById(req.params.id).populate("accessRequests", "name email");
    if (!copyrightDoc) return res.status(404).json({ error: "Record not found" });

    // Only owner (student) or mentor can view requests
    if (String(copyrightDoc.student) !== String(req.user._id) && String(copyrightDoc.mentor) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ requests: copyrightDoc.accessRequests || [] });
  } catch (error) {
    return next(error);
  }
});

// Check access status for the current user for a specific document
router.get("/:id/access-status", requireAuth, async (req, res, next) => {
  try {
    const copyrightDoc = await Copyright.findById(req.params.id).lean();
    if (!copyrightDoc) return res.status(404).json({ error: "Record not found" });

    const isOwner = String(copyrightDoc.student) === String(req.user._id);
    const requested = Array.isArray(copyrightDoc.accessRequests) && copyrightDoc.accessRequests.some((id) => String(id) === String(req.user._id));
    const granted = Array.isArray(copyrightDoc.accessGranted) && copyrightDoc.accessGranted.some((id) => String(id) === String(req.user._id));

    return res.json({ owner: isOwner, requested, granted });
  } catch (error) {
    return next(error);
  }
});

// Owner approves or denies a pending access request
router.put("/:id/approve-access", requireAuth, async (req, res, next) => {
  try {
    const { userId, approve } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const copyrightDoc = await Copyright.findById(req.params.id);
    if (!copyrightDoc) return res.status(404).json({ error: "Record not found" });

    // Only the owning student may approve/deny
    if (String(copyrightDoc.student) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    copyrightDoc.accessRequests = (copyrightDoc.accessRequests || []).filter((id) => String(id) !== String(userId));

    if (approve) {
      copyrightDoc.accessGranted = copyrightDoc.accessGranted || [];
      if (!copyrightDoc.accessGranted.some((id) => String(id) === String(userId))) {
        copyrightDoc.accessGranted.push(userId);
      }
    } else {
      // If denied, ensure not in accessGranted
      copyrightDoc.accessGranted = (copyrightDoc.accessGranted || []).filter((id) => String(id) !== String(userId));
    }

    await copyrightDoc.save();

    // Notify the requester about the outcome (include document title)
    try {
      await Notification.create({
        user: userId,
        type: approve ? "access_granted" : "access_denied",
        data: {
          copyrightId: String(copyrightDoc._id),
          title: copyrightDoc.title || "Document",
          approvedBy: req.user.name || "Owner",
        },
      });
    } catch (nerr) {
      console.error("Failed to notify requester", nerr);
    }

    const populated = await Copyright.findById(copyrightDoc._id)
      .populate("student", "name email college")
      .populate("mentor", "name email college");

    return res.json({ copyright: mapCopyright(populated) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

const express = require("express");

const Copyright = require("../models/Copyright");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.use(requireAuth, requireRole("mentor"));

function mapMentorOwned(item) {
  return {
    _id: item._id,
    title: item.title,
    filingNumber: item.filingNumber,
    abstract: item.abstract,
    college: item.college,
    status: item.status,
    portalLogin: item.portalLogin,
    portalPassword: item.portalPassword,
    fileUrl: item.fileName ? `/api/copyrights/${item._id}/file` : "",
    fileName: item.fileName,
    extractedTitle: item.extractedTitle,
    extractedFilingNumber: item.extractedFilingNumber,
    createdAt: item.createdAt,
    student: item.student,
    mentor: item.mentor,
  };
}

router.get("/students", async (req, res, next) => {
  try {
    const copyrights = await Copyright.find({ mentor: req.user._id })
      .populate("student", "_id name email college")
      .populate("mentor", "name email college")
      .sort({ createdAt: -1 });

    return res.json({ copyrights: copyrights.map(mapMentorOwned) });
  } catch (error) {
    return next(error);
  }
});

router.get("/global", async (req, res, next) => {
  try {
    const copyrights = await Copyright.find({ mentor: { $ne: req.user._id } })
      .populate("student", "_id name email college")
      .populate("mentor", "name email college")
      .sort({ createdAt: -1 });

    const masked = copyrights.map((item) => ({
      _id: item._id,
      title: item.title,
      filingNumber: item.filingNumber,
      abstract: item.abstract,
      college: item.college,
      status: item.status,
      portalLogin: "",
      portalPassword: "",
      fileUrl: "[Hidden: restricted]",
      fileName: "Hidden",
      extractedTitle: item.extractedTitle,
      extractedFilingNumber: item.extractedFilingNumber,
      createdAt: item.createdAt,
      student: item.student,
      mentor: item.mentor,
      accessLevel: "external",
    }));

    return res.json({ copyrights: masked });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

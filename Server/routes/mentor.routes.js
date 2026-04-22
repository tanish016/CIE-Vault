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
    // Use storageFileName presence to determine if file is available (covers encrypted storage)
    fileUrl: item.storageFileName ? `/api/copyrights/${item._id}/file` : "",
    receiptUrl: item.storageFileName ? `/api/copyrights/${item._id}/file` : "",
    fileName: item.fileName,
    // Expose report metadata when present on the model (either original name or storage path)
    reportFileName: item.reportFileName || "",
    reportUrl: (item.reportFileName || item.reportStorageFileName) ? `/api/copyrights/${item._id}/report` : "",
    extractedTitle: item.extractedTitle,
    extractedFilingNumber: item.extractedFilingNumber,
    extractedRegistrant: item.extractedRegistrant,
    extractedDiaryNumber: item.extractedDiaryNumber,
    extractedReceiptNumber: item.extractedReceiptNumber,
    extractedFilingDate: item.extractedFilingDate,
    extractedUser: item.extractedUser,
    extractedForm: item.extractedForm,
    extractedRequestNumber: item.extractedRequestNumber,
    createdAt: item.createdAt,
    student: item.student,
    mentor: item.mentor,
  };
}

router.get("/students", async (req, res, next) => {
  try {
    // Only include students from the same college as the mentor in "My Students"
    const copyrights = await Copyright.find({ mentor: req.user._id })
      .populate("student", "_id name email college")
      .populate("mentor", "name email college")
      .sort({ createdAt: -1 });

    const sameCollege = copyrights.filter((c) => {
      const studentCollege = c.student?.college || "";
      return String(studentCollege) === String(req.user.college);
    });

    return res.json({ copyrights: sameCollege.map(mapMentorOwned) });
  } catch (error) {
    return next(error);
  }
});

router.get("/global", async (req, res, next) => {
  try {
    // Global repository should only show filings that were explicitly requested for this mentor.
    // That includes:
    //  - filings where `mentor` === req.user._id but the student's college differs (cross-college assignment)
    //  - filings where this mentor's id appears in `accessRequests` (student requested access from this mentor)
    // We'll query for either condition and then expose file access for those requested items while keeping portal credentials hidden.

    const copyrights = await Copyright.find({
      $or: [{ accessRequests: req.user._id }, { mentor: req.user._id }],
    })
      .populate("student", "_id name email college")
      .populate("mentor", "name email college")
      .sort({ createdAt: -1 });

    const filtered = copyrights
      .filter((item) => {
        const isAssignedToMe = item.mentor && String(item.mentor._id || item.mentor) === String(req.user._id);
        const studentCollege = item.student?.college || "";

        // If it's assigned to me, include only when student is from a different college (cross-college)
        if (isAssignedToMe) return String(studentCollege) !== String(req.user.college);

        // Otherwise include only if I am explicitly listed in accessRequests
        const inRequests = Array.isArray(item.accessRequests) && item.accessRequests.some((id) => String(id) === String(req.user._id));
        return inRequests;
      })
      .map((item) => {
        // For requested items (either assigned cross-college or explicitly requested), allow file access but hide credentials
  // Determine file access based on storage presence as well as original filename
  const showFileAccess = item.fileName || item.storageFileName ? true : false;

        return {
          _id: item._id,
          title: item.title,
          filingNumber: item.filingNumber,
          abstract: item.abstract,
          college: item.college,
          status: item.status,
          portalLogin: "",
          portalPassword: "",
          fileUrl: showFileAccess ? `/api/copyrights/${item._id}/file` : "[Hidden: restricted]",
          receiptUrl: showFileAccess ? `/api/copyrights/${item._id}/file` : "[Hidden: restricted]",
          fileName: showFileAccess ? item.fileName : "Hidden",
          reportFileName: item.reportFileName || "",
          reportUrl: (item.reportFileName || item.reportStorageFileName) ? `/api/copyrights/${item._id}/report` : "",
          extractedTitle: item.extractedTitle,
          extractedFilingNumber: item.extractedFilingNumber,
          extractedRegistrant: item.extractedRegistrant,
          extractedDiaryNumber: item.extractedDiaryNumber,
          extractedReceiptNumber: item.extractedReceiptNumber,
          extractedFilingDate: item.extractedFilingDate,
          extractedUser: item.extractedUser,
          extractedForm: item.extractedForm,
          extractedRequestNumber: item.extractedRequestNumber,
          createdAt: item.createdAt,
          student: item.student,
          mentor: item.mentor,
          accessLevel: "requested",
        };
      });

    return res.json({ copyrights: filtered });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

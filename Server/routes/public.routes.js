const express = require("express");

const Copyright = require("../models/Copyright");

const router = express.Router();

function mapPublic(doc) {
  return {
    _id: doc._id,
    title: doc.title,
    abstract: doc.abstract,
    college: doc.college,
    filingNumber: doc.filingNumber,
    createdAt: doc.createdAt,
    student: doc.student,
    mentor: doc.mentor,
    extractedTitle: doc.extractedTitle,
    extractedFilingNumber: doc.extractedFilingNumber,
    documentType: doc.documentType || "copyright",
  };
}

// Public listing of approved copyrights
router.get("/copyrights", async (req, res, next) => {
  try {
    const { q, college } = req.query;

  // Only return approved documents that are marked public
  const query = { status: "approved", isPublic: true };

    if (college) query.college = String(college);

    let docs = await Copyright.find(query)
      .populate("student", "name college")
      .populate("mentor", "name college")
      .sort({ createdAt: -1 })
      .lean();

    if (q && typeof q === "string") {
      const term = q.toLowerCase();
      docs = docs.filter((d) => {
        return (
          (d.title && String(d.title).toLowerCase().includes(term)) ||
          (d.abstract && String(d.abstract).toLowerCase().includes(term)) ||
          (d.extractedTitle && String(d.extractedTitle).toLowerCase().includes(term))
        );
      });
    }

    const results = docs.map(mapPublic);

    return res.json({ results });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

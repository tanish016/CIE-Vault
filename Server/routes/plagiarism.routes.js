const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

const Copyright = require('../models/Copyright');
const { requireAuth } = require('../middlewares/auth');
const { decryptBuffer } = require('../utils/file-encryption');

const router = express.Router();

const PRIVATE_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'private');
const RECEIPTS_DIR = path.join(PRIVATE_UPLOADS_DIR, 'receipts');

function tokenizeWords(text) {
  return (text || '')
    .replace(/[\n\r]/g, ' ')
    .replace(/["'`\(\)\[\],;:.!?<>\/\\]/g, '')
    .split(/\s+/)
    .map(w => w.trim().toLowerCase())
    .filter(Boolean);
}

function shinglesFromWords(words, k = 5) {
  const shingles = new Set();
  for (let i = 0; i + k <= words.length; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }
  return shingles;
}

async function extractTextFromEncryptedFile(doc) {
  if (!doc || !doc.storageFileName) return '';
  const encryptedPath = path.join(RECEIPTS_DIR, path.basename(doc.storageFileName));
  const encryptedBuffer = await fs.readFile(encryptedPath);
  const plain = decryptBuffer(encryptedBuffer, doc.fileIv, doc.fileAuthTag);
  const parsed = await pdfParse(plain);
  return parsed.text || '';
}

router.post('/check', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing document id' });

    const doc = await Copyright.findById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Only the owning student may run plagiarism checks on their files
    if (!doc.student || String(doc.student) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Extract text from the encrypted file
    const text = await extractTextFromEncryptedFile(doc);
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Unable to extract text from the PDF' });
    }

    // If Gemini API is configured, try to use it
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = process.env.GEMINI_API_URL;
    if (geminiKey && geminiUrl) {
      try {
        // We send a prompt asking for JSON output with percentage and advice.
        const prompt = `You are a plagiarism analysis assistant. Given the document text provide a JSON object with keys: percentage (number 0-100) and advice (short string). Respond ONLY with valid JSON.\n\nDocument:\n${text.slice(0, 10000)}`;

        const r = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${geminiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        const body = await r.text();
        // Try to extract JSON from the response text
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (err) {
          // Attempt to find JSON substring
          const match = body.match(/\{[\s\S]*\}/m);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed && typeof parsed.percentage === 'number') {
          return res.json({ percentage: parsed.percentage, advice: parsed.advice || '', source: 'gemini' });
        }
        // otherwise fall through to local analysis
      } catch (err) {
        console.warn('Gemini analysis failed, falling back to local check', err.message || err);
      }
    }

    // Local similarity check against other research documents (simple shingle overlap)
    const targetWords = tokenizeWords(text);
    const targetShingles = shinglesFromWords(targetWords, 5);
    const totalShingles = targetShingles.size || 1;

    // Compare against up to 10 other research documents
    const others = await Copyright.find({ documentType: 'research', _id: { $ne: id } }).limit(10);
    let highestOverlapPercent = 0;
    for (const other of others) {
      try {
        const otherText = await extractTextFromEncryptedFile(other);
        const otherShingles = shinglesFromWords(tokenizeWords(otherText), 5);
        let common = 0;
        for (const s of targetShingles) if (otherShingles.has(s)) common++;
        const pct = (common / totalShingles) * 100;
        if (pct > highestOverlapPercent) highestOverlapPercent = pct;
      } catch (err) {
        // ignore failures for individual docs
      }
    }

    const percentage = Math.round(highestOverlapPercent * 100) / 100;
    // Simple advice heuristics
    let advice = 'Good job. Keep citing your sources and paraphrasing where appropriate.';
    if (percentage > 40) {
      advice = 'High similarity detected. Consider rewriting sections, adding citations, and quoting sources.';
    } else if (percentage > 15) {
      advice = 'Moderate similarity. Paraphrase and add clearer citations to reduce overlap.';
    } else if (percentage > 5) {
      advice = 'Minor similarity. Verify citations and rephrase small matching sections.';
    }

    return res.json({ percentage, advice, source: 'local' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function resolveKeyMaterial() {
  return process.env.FILE_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
}

function getMasterKey() {
  const material = resolveKeyMaterial();

  if (!material) {
    throw new Error("Missing FILE_ENCRYPTION_KEY or JWT_SECRET for file encryption");
  }

  // Always derive a fixed 32-byte key from configured secret material.
  return crypto.createHash("sha256").update(material).digest();
}

function encryptBuffer(plainBuffer) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    ivHex: iv.toString("hex"),
    authTagHex: authTag.toString("hex"),
  };
}

function decryptBuffer(encryptedBuffer, ivHex, authTagHex) {
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

module.exports = {
  encryptBuffer,
  decryptBuffer,
};

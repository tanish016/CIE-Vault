const mongoose = require("mongoose");

const copyrightSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    filingNumber: {
      type: String,
      default: "",
      trim: true,
    },
    abstract: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    portalLogin: {
      type: String,
      default: "",
      trim: true,
    },
    portalPassword: {
      type: String,
      default: "",
      trim: true,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    storageFileName: {
      type: String,
      default: "",
    },
    fileIv: {
      type: String,
      default: "",
    },
    fileAuthTag: {
      type: String,
      default: "",
    },
    // Optional report file stored securely on the server (not exposed to mentors/users)
    reportFileName: {
      type: String,
      default: "",
    },
    reportStorageFileName: {
      type: String,
      default: "",
    },
    reportFileIv: {
      type: String,
      default: "",
    },
    reportFileAuthTag: {
      type: String,
      default: "",
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    extractedTitle: {
      type: String,
      default: "",
    },
    extractedFilingNumber: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    documentType: {
      type: String,
      enum: ["copyright", "research"],
      default: "copyright",
    },
    accessRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    accessGranted: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Copyright", copyrightSchema);

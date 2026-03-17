const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    copyright: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Copyright",
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);

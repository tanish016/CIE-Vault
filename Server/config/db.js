const mongoose = require("mongoose");
const User = require("../models/User");

async function syncUserIndexes() {
  const userCollection = mongoose.connection.collection("users");

  // Remove legacy unique index from older schema versions.
  try {
    const indexes = await userCollection.indexes();
    const hasUsernameIndex = indexes.some((index) => index.name === "username_1");

    if (hasUsernameIndex) {
      await userCollection.dropIndex("username_1");
      console.log("Dropped legacy index: username_1");
    }
  } catch (error) {
    console.warn("Skipping legacy index cleanup:", error.message);
  }

  // Clean up legacy/invalid records that block unique email index creation.
  const cleanupResult = await User.deleteMany({
    $or: [{ email: null }, { email: "" }, { email: { $exists: false } }],
  });

  if (cleanupResult.deletedCount > 0) {
    console.log(`Removed ${cleanupResult.deletedCount} users with invalid email`);
  }

  await User.syncIndexes();
  console.log("User indexes synchronized");
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  await mongoose.connect(mongoUri);
  await syncUserIndexes();
  console.log("MongoDB connected");
}

module.exports = connectDB;

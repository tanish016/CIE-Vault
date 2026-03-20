const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const copyrightRoutes = require("./routes/copyright.routes");
const mentorRoutes = require("./routes/mentor.routes");
const notificationRoutes = require("./routes/notification.routes");
const profileRoutes = require("./routes/profile.routes");
const publicRoutes = require("./routes/public.routes");
const errorHandler = require("./middlewares/error-handler");

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/copyrights", copyrightRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/public", publicRoutes);

app.use(errorHandler);

const port = process.env.PORT || 8000;

async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is running successfully at ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
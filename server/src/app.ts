
import express from "express";
import cors from "cors";
import hotelsRouter from "./routes/hotels.js";
import branchesRouter from "./routes/branches.js";
import roomsRouter from "./routes/rooms.js";
import bookingsRouter from "./routes/bookings.js";
import authRouter from "./routes/auth.js";
import favoritesRouter from "./routes/favorites.js";
import reviewsRouter from "./routes/reviews.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/hotels", hotelsRouter);
app.use("/api/v1/branches", branchesRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/favorites", favoritesRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/auth", authRouter);

app.get("/", (_req, res) => {
  res.status(200).send("Hotel Booking API is running!");
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hotel Booking API is running",
  });
});

export default app;

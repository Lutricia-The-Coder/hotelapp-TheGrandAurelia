import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import hotelsRouter from "./routes/hotels.js";
import branchesRouter from "./routes/branches.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/v1/hotels", hotelsRouter); 
app.use("/api/v1/branches", branchesRouter);
app.get("/", (_req, res) => {
  res.status(200).send("Hotel Booking API is running!");
});
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hotel Booking API is running",
  });
  
});

app.listen(PORT, () => {
  console.log(`Hotel API running at http://localhost:${PORT}`);
});
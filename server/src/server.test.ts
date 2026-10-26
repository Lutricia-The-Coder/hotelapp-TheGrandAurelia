
import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";

const app = express();

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hotel Booking API is running",
  });
});

describe("Health API", () => {
  it("returns a successful health status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.message).toBe("Hotel Booking API is running");
  });
});

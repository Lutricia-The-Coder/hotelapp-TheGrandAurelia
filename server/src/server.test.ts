
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

describe("Health API", () => {
  it("returns a successful health status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.message).toBe("Hotel Booking API is running");
  });

  it("returns the API welcome message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Hotel Booking API is running!");
  });
});

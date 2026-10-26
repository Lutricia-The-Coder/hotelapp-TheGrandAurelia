
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";


const { findManyMock, findUniqueMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("./lib/prisma.js", () => ({
  default: {
    hotel: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
    },
  },
}));


import app from "./app.js";

describe("Health API", () => {
  it("returns a successful health status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("returns the API welcome message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Hotel Booking API is running!");
  });
  
it("returns details for a single hotel", async () => {
  findUniqueMock.mockResolvedValue({
    id: "hotel-test-1",
    name: "Test Hotel",
    description: "A hotel for automated testing",
    branches: [],
    images: [],
    reviews: [],
  });

  const response = await request(app).get(
    "/api/v1/hotels/hotel-test-1",
  );

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.name).toBe("Test Hotel");
  expect(findUniqueMock).toHaveBeenCalledOnce();
});

});

describe("Hotels API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a list of hotels", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "hotel-test-1",
        name: "Test Hotel",
        description: "A hotel for automated testing",
        branches: [],
      },
    ]);

    const response = await request(app).get("/api/v1/hotels");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].name).toBe("Test Hotel");
    expect(findManyMock).toHaveBeenCalledOnce();
  });
});

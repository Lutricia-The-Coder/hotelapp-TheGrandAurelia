
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const {
  findManyMock,
  findUniqueMock,
  createMock,
  updateMock,
  deleteMock,
  branchFindManyMock,
  branchCreateMock,
  branchUpdateMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  branchFindManyMock: vi.fn(),
  branchCreateMock: vi.fn(),
  branchUpdateMock: vi.fn(),
}));

vi.mock("./lib/prisma.js", () => ({
  default: {
    hotel: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
    hotelBranch: {
      findMany: branchFindManyMock,
      create: branchCreateMock,
      update: branchUpdateMock,
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
      images: [],
    },
  ]);

  const response = await request(app).get("/api/v1/hotels");

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.count).toBe(1);
  expect(response.body.data[0].name).toBe("Test Hotel");
  expect(findManyMock).toHaveBeenCalledOnce();
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

it("creates a hotel with valid data", async () => {
  createMock.mockResolvedValue({
    id: "hotel-test-2",
    name: "New Test Hotel",
    description: "A newly created test hotel",
  });

  const response = await request(app)
    .post("/api/v1/hotels")
    .send({
      name: "New Test Hotel",
      description: "A newly created test hotel",
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data.name).toBe("New Test Hotel");
  expect(createMock).toHaveBeenCalledOnce();
});


it("updates an existing hotel", async () => {
  updateMock.mockResolvedValue({
    id: "hotel-test-1",
    name: "Updated Test Hotel",
    description: "Updated hotel description",
  });

  const response = await request(app)
    .put("/api/v1/hotels/hotel-test-1")
    .send({
      name: "Updated Test Hotel",
      description: "Updated hotel description",
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.name).toBe("Updated Test Hotel");
  expect(updateMock).toHaveBeenCalledOnce();
});

it("deletes an existing hotel", async () => {
  deleteMock.mockResolvedValue({
    id: "hotel-test-1",
    name: "Test Hotel",
    description: "A hotel for automated testing",
  });

  const response = await request(app).delete(
    "/api/v1/hotels/hotel-test-1",
  );

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(deleteMock).toHaveBeenCalledOnce();
});


});

describe("Hotel Branches API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns branches for a specific hotel", async () => {
    branchFindManyMock.mockResolvedValue([
      {
        id: "branch-test-1",
        name: "Central Branch",
        address: "123 Main Street",
        city: "Polokwane",
        country: "South Africa",
        hotelId: "hotel-test-1",
        roomTypes: [],
        amenities: [],
      },
    ]);

    const response = await request(app).get(
      "/api/v1/branches/hotel/hotel-test-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Central Branch");
    expect(branchFindManyMock).toHaveBeenCalledOnce();
  });
  
  it("creates a hotel branch with valid data", async () => {
    branchCreateMock.mockResolvedValue({
      id: "branch-test-2",
      name: "New Central Branch",
      address: "456 Main Street",
      city: "Polokwane",
      country: "South Africa",
      hotelId: "hotel-test-1",
    });

    const response = await request(app)
      .post("/api/v1/branches")
      .send({
        name: "New Central Branch",
        address: "456 Main Street",
        city: "Polokwane",
        country: "South Africa",
        hotelId: "hotel-test-1",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("New Central Branch");
    expect(branchCreateMock).toHaveBeenCalledOnce();
  });

  it("updates an existing hotel branch", async () => {
    branchUpdateMock.mockResolvedValue({
      id: "branch-test-1",
      name: "Updated Central Branch",
      address: "789 Main Street",
      city: "Polokwane",
      country: "South Africa",
      hotelId: "hotel-test-1",
    });

    const response = await request(app)
      .put("/api/v1/branches/branch-test-1")
      .send({
        name: "Updated Central Branch",
        address: "789 Main Street",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("Updated Central Branch");
    expect(branchUpdateMock).toHaveBeenCalledOnce();
  });

});


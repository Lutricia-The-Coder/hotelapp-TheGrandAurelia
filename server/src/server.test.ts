
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
  branchDeleteMock,
  roomFindManyMock,
  roomCreateMock,
  roomUpdateMock,
  roomDeleteMock,
  roomFindUniqueMock,
  userFindUniqueMock,
  bookingFindManyMock,
  bookingCreateMock,
  bookingUpdateMock,
  bookingDeleteMock,
  bookingFindUniqueMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  branchFindManyMock: vi.fn(),
  branchCreateMock: vi.fn(),
  branchUpdateMock: vi.fn(),
  branchDeleteMock: vi.fn(),
  roomFindManyMock: vi.fn(),
  roomCreateMock: vi.fn(),
  roomUpdateMock: vi.fn(),
  roomDeleteMock: vi.fn(),
  roomFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  bookingFindManyMock: vi.fn(),
  bookingFindUniqueMock: vi.fn(),
  bookingCreateMock: vi.fn(),
  bookingUpdateMock: vi.fn(),
  bookingDeleteMock: vi.fn(),
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
      delete: branchDeleteMock,
    },
    roomType: {
      findMany: roomFindManyMock,
      findUnique: roomFindUniqueMock,
      create: roomCreateMock,
      update: roomUpdateMock,
      delete: roomDeleteMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
    booking: {
      findMany: bookingFindManyMock,
      findUnique: bookingFindUniqueMock,
      create: bookingCreateMock,
      update: bookingUpdateMock,
      delete: bookingDeleteMock,
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

  it("deletes an existing hotel branch", async () => {
    branchDeleteMock.mockResolvedValue({
      id: "branch-test-1",
      name: "Central Branch",
      address: "123 Main Street",
      city: "Polokwane",
      country: "South Africa",
      hotelId: "hotel-test-1",
    });

    const response = await request(app).delete(
      "/api/v1/branches/branch-test-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(branchDeleteMock).toHaveBeenCalledOnce();
  });

});

describe("Room Types API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns room types for a specific branch", async () => {
    roomFindManyMock.mockResolvedValue([
      {
        id: "room-test-1",
        name: "Deluxe Room",
        description: "A spacious deluxe room",
        pricePerNight: 1200,
        capacity: 2,
        totalRooms: 10,
        branchId: "branch-test-1",
      },
    ]);

    const response = await request(app).get(
      "/api/v1/rooms/branch/branch-test-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Deluxe Room");
    expect(roomFindManyMock).toHaveBeenCalledOnce();
  });
  
  it("creates a room type with valid data", async () => {
    roomCreateMock.mockResolvedValue({
      id: "room-test-2",
      name: "Family Suite",
      description: "A spacious family suite",
      pricePerNight: 1800,
      capacity: 4,
      totalRooms: 5,
      branchId: "branch-test-1",
    });

    const response = await request(app)
      .post("/api/v1/rooms")
      .send({
        name: "Family Suite",
        description: "A spacious family suite",
        pricePerNight: 1800,
        capacity: 4,
        totalRooms: 5,
        branchId: "branch-test-1",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("Family Suite");
    expect(roomCreateMock).toHaveBeenCalledOnce();
  });

  it("updates an existing room type", async () => {
    roomUpdateMock.mockResolvedValue({
      id: "room-test-1",
      name: "Updated Deluxe Room",
      description: "An upgraded deluxe room",
      pricePerNight: 1500,
      capacity: 2,
      totalRooms: 8,
      branchId: "branch-test-1",
    });

    const response = await request(app)
      .put("/api/v1/rooms/room-test-1")
      .send({
        name: "Updated Deluxe Room",
        pricePerNight: 1500,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("Updated Deluxe Room");
    expect(roomUpdateMock).toHaveBeenCalledOnce();
  });

  it("deletes an existing room type", async () => {
    roomDeleteMock.mockResolvedValue({
      id: "room-test-1",
      name: "Deluxe Room",
      branchId: "branch-test-1",
    });

    const response = await request(app).delete(
      "/api/v1/rooms/room-test-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(roomDeleteMock).toHaveBeenCalledOnce();
  });

});


describe("Bookings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns bookings for a specific user", async () => {
    bookingFindManyMock.mockResolvedValue([
      {
        id: "booking-test-1",
        userId: "user-test-1",
        roomTypeId: "room-test-1",
        checkIn: new Date("2026-11-01T00:00:00.000Z"),
        checkOut: new Date("2026-11-03T00:00:00.000Z"),
        adults: 2,
        children: 0,
        roomQuantity: 1,
        totalPrice: 2400,
        status: "PENDING",
        roomType: {
          name: "Deluxe Room",
          branch: {
            name: "Central Branch",
            hotel: { name: "Test Hotel" },
          },
        },
        payments: [],
      },
    ]);

    const response = await request(app).get(
      "/api/v1/bookings/user/user-test-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(bookingFindManyMock).toHaveBeenCalledOnce();
  });
roomFindUniqueMock.mockResolvedValue({
  id: "room-test-1",
  pricePerNight: 1200,
  totalRooms: 10,
});
userFindUniqueMock.mockResolvedValue({
  id: "user-test-1",
});
  it("creates a booking with valid data", async () => {
    bookingCreateMock.mockResolvedValue({
      id: "booking-test-2",
      userId: "user-test-1",
      roomTypeId: "room-test-1",
      checkIn: new Date("2026-11-01T00:00:00.000Z"),
      checkOut: new Date("2026-11-03T00:00:00.000Z"),
      adults: 2,
      children: 0,
      roomQuantity: 1,
      totalPrice: 2400,
      status: "PENDING",
    });

    const response = await request(app)
      .post("/api/v1/bookings")
      .send({
        userId: "user-test-1",
        roomTypeId: "room-test-1",
        checkIn: "2026-11-01",
        checkOut: "2026-11-03",
        adults: 2,
        children: 0,
        roomQuantity: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(bookingCreateMock).toHaveBeenCalledOnce();
  });

  it("cancels an existing pending booking", async () => {
    bookingFindUniqueMock.mockResolvedValue({
      id: "booking-test-1",
      userId: "user-test-1",
      status: "PENDING",
    });

    bookingUpdateMock.mockResolvedValue({
      id: "booking-test-1",
      userId: "user-test-1",
      status: "CANCELLED",
    });

    const response = await request(app).patch(
      "/api/v1/bookings/booking-test-1/cancel",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(bookingFindUniqueMock).toHaveBeenCalledOnce();
    expect(bookingUpdateMock).toHaveBeenCalledOnce();
  });

});


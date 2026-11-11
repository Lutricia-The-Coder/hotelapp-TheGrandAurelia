
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { getPaymentCallbackUrl } from "./lib/payment-callback.js";
const {
  findManyMock,
  findUniqueMock,
  createMock,
  updateMock,
  deleteMock,
  branchFindManyMock,
  branchFindUniqueMock,
  branchCreateMock,
  branchUpdateMock,
  branchDeleteMock,
  branchFavoriteFindManyMock,
  branchFavoriteUpsertMock,
  branchFavoriteDeleteManyMock,
  roomFindManyMock,
  roomCreateMock,
  roomUpdateMock,
  roomDeleteMock,
  roomFindUniqueMock,
  userFindUniqueMock,
  userUpdateMock,
  passwordResetTokenFindUniqueMock,
  passwordResetTokenCreateMock,
  passwordResetTokenDeleteManyMock,
  sendEmailMock,
  bookingFindManyMock,
  bookingCreateMock,
  bookingUpdateMock,
  bookingUpdateManyMock,
  bookingDeleteMock,
  bookingFindUniqueMock,
    bookingAggregateMock,
    paymentCreateMock,
    paymentFindFirstMock,
    paymentFindUniqueMock,
    paymentUpdateManyMock,
transactionMock,
    reviewFindManyMock,
    reviewUpsertMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  branchFindManyMock: vi.fn(),
  branchFindUniqueMock: vi.fn(),
  branchCreateMock: vi.fn(),
  branchUpdateMock: vi.fn(),
  branchDeleteMock: vi.fn(),
  branchFavoriteFindManyMock: vi.fn(),
  branchFavoriteUpsertMock: vi.fn(),
  branchFavoriteDeleteManyMock: vi.fn(),
  roomFindManyMock: vi.fn(),
  roomCreateMock: vi.fn(),
  roomUpdateMock: vi.fn(),
  roomDeleteMock: vi.fn(),
  roomFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
  passwordResetTokenFindUniqueMock: vi.fn(),
  passwordResetTokenCreateMock: vi.fn(),
  passwordResetTokenDeleteManyMock: vi.fn(),
  sendEmailMock: vi.fn(),
  bookingFindManyMock: vi.fn(),
  bookingFindUniqueMock: vi.fn(),
  bookingCreateMock: vi.fn(),
  bookingUpdateMock: vi.fn(),
  bookingUpdateManyMock: vi.fn(),
  bookingDeleteMock: vi.fn(),
  bookingAggregateMock: vi.fn(),
  paymentCreateMock: vi.fn(),
  paymentFindFirstMock: vi.fn(),
  paymentFindUniqueMock: vi.fn(),
  paymentUpdateManyMock: vi.fn(),
transactionMock: vi.fn(),
  reviewFindManyMock: vi.fn(),
  reviewUpsertMock: vi.fn(),
}));
const TEST_JWT_SECRET = "test-only-secret-for-booking-tests";

process.env.JWT_SECRET = TEST_JWT_SECRET;

describe("Paystack callback URL", () => {
  it("uses the production frontend when production is misconfigured with localhost", () => {
    expect(
      getPaymentCallbackUrl("http://localhost:5173", "production"),
    ).toBe(
      "https://hotelapp-the-grand-aurelia.vercel.app/?payment=success",
    );
  });

  it("preserves the configured frontend URL outside production", () => {
    expect(
      getPaymentCallbackUrl("http://localhost:5173/", "development"),
    ).toBe("http://localhost:5173/?payment=success");
  });

  it("uses the configured production frontend URL", () => {
    expect(
      getPaymentCallbackUrl(
        "https://hotelapp-the-grand-aurelia.vercel.app/",
        "production",
      ),
    ).toBe(
      "https://hotelapp-the-grand-aurelia.vercel.app/?payment=success",
    );
  });
});

function authHeader(userId = "user-test-1") {
  const token = jwt.sign(
    { sub: userId, role: "GUEST" },
    TEST_JWT_SECRET,
    { expiresIn: "1h" },
  );

  return {
    Authorization: `Bearer ${token}`,
  };
}
// Mock the prisma client to use the hoisted mocks

function adminAuthHeader(userId = "admin-test-1") {
  const token = jwt.sign(
    { sub: userId, role: "ADMIN" },
    TEST_JWT_SECRET,
    { expiresIn: "1h" },
  );

  return {
    Authorization: `Bearer ${token}`,
  };
}

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
      findUnique: branchFindUniqueMock,
      create: branchCreateMock,
      update: branchUpdateMock,
      delete: branchDeleteMock,
    },
    branchFavorite: {
      findMany: branchFavoriteFindManyMock,
      upsert: branchFavoriteUpsertMock,
      deleteMany: branchFavoriteDeleteManyMock,
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
      update: userUpdateMock,
    },
    passwordResetToken: {
      findUnique: passwordResetTokenFindUniqueMock,
      create: passwordResetTokenCreateMock,
      deleteMany: passwordResetTokenDeleteManyMock,
    },
    review: {
      findMany: reviewFindManyMock,
      upsert: reviewUpsertMock,
    },
    booking: {
      findMany: bookingFindManyMock,
      findUnique: bookingFindUniqueMock,
      create: bookingCreateMock,
      update: bookingUpdateMock,
      updateMany: bookingUpdateManyMock,
      delete: bookingDeleteMock,
      aggregate: bookingAggregateMock,
    },
    $transaction: transactionMock,

payment: {
  create: paymentCreateMock,
  findUnique: paymentFindUniqueMock,
  findFirst: paymentFindFirstMock,
  update: vi.fn(),
  updateMany: paymentUpdateManyMock,
},
  },
}));

vi.mock("./lib/mailer.js", () => ({
  sendEmail: sendEmailMock,
}));

import app from "./app.js";

describe("Password reset API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = "http://localhost:5173";
  });

  afterEach(() => {
    userFindUniqueMock.mockReset();
  });

  it("emails a short-lived reset link and changes the password once used", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "user-test-1",
      email: "test@example.com",
    });
    passwordResetTokenDeleteManyMock.mockResolvedValue({ count: 0 });
    passwordResetTokenCreateMock.mockResolvedValue({ id: "reset-token-1" });
    sendEmailMock.mockResolvedValue(undefined);

    const requestResponse = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: " TEST@example.com " });

    expect(requestResponse.status).toBe(200);
    expect(requestResponse.body.message).toMatch(/if an account exists/i);
    expect(passwordResetTokenCreateMock).toHaveBeenCalledOnce();
    const storedHash = passwordResetTokenCreateMock.mock.calls[0][0].data.tokenHash;
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);

    const emailText = sendEmailMock.mock.calls[0][0].text as string;
    const token = emailText.match(/reset_token=([a-f0-9]{64})/)?.[1];
    expect(token).toBeTruthy();
    expect(token).not.toBe(storedHash);

    passwordResetTokenFindUniqueMock.mockResolvedValue({
      userId: "user-test-1",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    passwordResetTokenDeleteManyMock.mockResolvedValue({ count: 1 });
    userUpdateMock.mockResolvedValue({ id: "user-test-1" });
    transactionMock.mockImplementation(
      async (callback: (transaction: {
        passwordResetToken: { deleteMany: typeof passwordResetTokenDeleteManyMock };
        user: { update: typeof userUpdateMock };
      }) => Promise<unknown>) =>
        callback({
          passwordResetToken: { deleteMany: passwordResetTokenDeleteManyMock },
          user: { update: userUpdateMock },
        }),
    );

    const resetResponse = await request(app)
      .post("/api/v1/auth/password-reset/complete")
      .send({ token, password: "NewSecure123!" });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toMatch(/password has been reset/i);
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-test-1" },
        data: { passwordHash: expect.any(String) },
      }),
    );
    expect(passwordResetTokenDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-test-1" },
    });

    passwordResetTokenDeleteManyMock.mockResolvedValue({ count: 0 });
    const reusedTokenResponse = await request(app)
      .post("/api/v1/auth/password-reset/complete")
      .send({ token, password: "AnotherSecure123!" });

    expect(reusedTokenResponse.status).toBe(400);
    expect(userUpdateMock).toHaveBeenCalledOnce();
  });

  it("does not reveal whether the requested email has an account", async () => {
    userFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: "unknown@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/if an account exists/i);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects malformed or weak reset requests", async () => {
    const response = await request(app)
      .post("/api/v1/auth/password-reset/complete")
      .send({ token: "invalid-token", password: "weak" });

    expect(response.status).toBe(400);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe("CORS configuration", () => {
  it("allows local Vite requests with credentials", async () => {
    const response = await request(app)
      .options("/api/v1/favorites/branches")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("continues to allow the production frontend", async () => {
    const response = await request(app)
      .options("/api/v1/hotels")
      .set("Origin", "https://hotelapp-the-grand-aurelia.vercel.app")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://hotelapp-the-grand-aurelia.vercel.app",
    );
  });

  it("does not grant CORS access to unknown origins", async () => {
    const response = await request(app)
      .options("/api/v1/hotels")
      .set("Origin", "https://untrusted.example")
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Branch favorites API", () => {
  const branchId = "50cb4a8d-4c79-4f34-8894-2a6ca1214c99";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns saved branches for the authenticated user", async () => {
    branchFavoriteFindManyMock.mockResolvedValue([
      {
        userId: "user-test-1",
        branchId,
        branch: { id: branchId, name: "Riverside Branch" },
      },
    ]);

    const response = await request(app)
      .get("/api/v1/favorites/branches")
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body.data[0].branch.name).toBe("Riverside Branch");
    expect(branchFavoriteFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-test-1" } }),
    );
  });

  it("saves a branch independently of its hotel", async () => {
    branchFindUniqueMock.mockResolvedValue({ id: branchId });
    branchFavoriteUpsertMock.mockResolvedValue({
      userId: "user-test-1",
      branchId,
      branch: { id: branchId, name: "Riverside Branch" },
    });

    const response = await request(app)
      .post(`/api/v1/favorites/branches/${branchId}`)
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(branchFavoriteUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_branchId: { userId: "user-test-1", branchId },
        },
      }),
    );
  });

  it("removes only the selected branch favorite", async () => {
    branchFavoriteDeleteManyMock.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .delete(`/api/v1/favorites/branches/${branchId}`)
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(branchFavoriteDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-test-1", branchId },
    });
  });
});

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
    {
      id: "hotel-test-2",
      name: "Second Test Hotel",
      description: "A second hotel for automated testing",
      branches: [],
      images: [],
    },
  ]);

  const response = await request(app).get("/api/v1/hotels");

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.count).toBe(2);
  expect(response.body.data[0].name).toBe("Test Hotel");
  expect(response.body.data[1].name).toBe("Second Test Hotel");
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
     .set(adminAuthHeader())
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
    .set(adminAuthHeader())
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
  )
    .set(adminAuthHeader());
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
       .set(adminAuthHeader())
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
      .set(adminAuthHeader())
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
    )
      .set(adminAuthHeader());
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
        images: ["/uploads/rooms/deluxe-room.jpg"],
      },
    ]);

    const response = await request(app).get(
      "/api/v1/rooms/branch/branch-test-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Deluxe Room");
    expect(response.body.data[0].images).toEqual([
      "/uploads/rooms/deluxe-room.jpg",
    ]);
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
       .set(adminAuthHeader())
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
       .set(adminAuthHeader())
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
    )
      .set(adminAuthHeader());
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(roomDeleteMock).toHaveBeenCalledOnce();
  });

it("rejects an availability request with missing dates", async () => {
  const response = await request(app).get(
    "/api/v1/rooms/room-test-1/availability",
  );

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

it("rejects an availability request when check-out is before check-in", async () => {
  const response = await request(app)
    .get("/api/v1/rooms/room-test-1/availability")
    .query({
      checkIn: "2026-11-10",
      checkOut: "2026-11-08",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});


it("returns available room quantity for valid dates", async () => {
  roomFindUniqueMock.mockResolvedValue({
    id: "room-test-1",
    totalRooms: 10,
  });

  bookingAggregateMock.mockResolvedValue({
    _sum: {
      roomQuantity: 3,
    },
  });

  const response = await request(app)
    .get("/api/v1/rooms/room-test-1/availability")
    .query({
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.totalRooms).toBe(10);
  expect(response.body.data.bookedRooms).toBe(3);
  expect(response.body.data.availableRooms).toBe(7);
  expect(response.body.data.available).toBe(true);
  expect(bookingAggregateMock).toHaveBeenCalledOnce();
});

it("returns 404 when checking availability for a missing room type", async () => {
  roomFindUniqueMock.mockResolvedValue(null);

  const response = await request(app)
    .get("/api/v1/rooms/nonexistent-room/availability")
    .query({
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
    });

  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
  expect(bookingAggregateMock).not.toHaveBeenCalled();
});

it("returns zero available rooms when all rooms are booked", async () => {
  roomFindUniqueMock.mockResolvedValue({
    id: "room-test-1",
    totalRooms: 10,
  });

  bookingAggregateMock.mockResolvedValue({
    _sum: {
      roomQuantity: 10,
    },
  });

  const response = await request(app)
    .get("/api/v1/rooms/room-test-1/availability")
    .query({
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.bookedRooms).toBe(10);
  expect(response.body.data.availableRooms).toBe(0);
  expect(response.body.data.available).toBe(false);
});

it("never returns negative available rooms when bookings exceed inventory", async () => {
  roomFindUniqueMock.mockResolvedValue({
    id: "room-test-1",
    totalRooms: 10,
  });

  bookingAggregateMock.mockResolvedValue({
    _sum: {
      roomQuantity: 12,
    },
  });

  const response = await request(app)
    .get("/api/v1/rooms/room-test-1/availability")
    .query({
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.bookedRooms).toBe(12);
  expect(response.body.data.availableRooms).toBe(0);
  expect(response.body.data.available).toBe(false);
});

it("rejects invalid date formats in availability requests", async () => {
  const response = await request(app)
    .get("/api/v1/rooms/room-test-1/availability")
    .query({
      checkIn: "not-a-date",
      checkOut: "2026-11-12",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});


});


describe("Bookings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Password policy API", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it.each([
      ["short", "Aa1!abc"],
      ["missing uppercase", "strong123!"],
      ["missing number", "StrongPass!"],
      ["missing special character", "StrongPass123"],
    ])("rejects a password that is %s", async (_reason, password) => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          title: "Ms",
          name: "Test User",
          email: "test@example.com",
          password,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("at least 8 characters");
      expect(userFindUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe("Paystack payment confirmation", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      process.env.PAYSTACK_SECRET_KEY = "test-paystack-secret";
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      delete process.env.PAYSTACK_SECRET_KEY;
    });

    it("persists successful payment and booking statuses for the user and admin", async () => {
      const reference = "GA-payment-test-1";
      const bookingId = "booking-test-2";
      const checkIn = new Date("2026-12-01T00:00:00.000Z");
      const checkOut = new Date("2026-12-03T00:00:00.000Z");

      paymentFindFirstMock
        .mockResolvedValueOnce({
          status: "PENDING",
          amount: 2400,
          currency: "ZAR",
          booking: {
            id: bookingId,
            checkIn,
            checkOut,
            totalPrice: 2400,
            roomTypeId: "room-test-1",
            userId: "user-test-1",
            status: "PENDING",
          },
        })
        .mockResolvedValueOnce({
          status: "SUCCEEDED",
          amount: 2400,
          currency: "ZAR",
          booking: {
            id: bookingId,
            checkIn,
            checkOut,
            totalPrice: 2400,
            roomTypeId: "room-test-1",
            userId: "user-test-1",
            status: "CONFIRMED",
          },
        });

      paymentFindUniqueMock.mockResolvedValue({
        id: "payment-test-1",
        provider: "paystack",
        providerPaymentId: reference,
        bookingId,
        amount: 2400,
        currency: "ZAR",
        booking: {
          userId: "user-test-1",
          user: { email: "guest@example.com", name: "Guest" },
          roomType: { name: "Suite" },
          checkIn,
          checkOut,
        },
      });

      paymentUpdateManyMock.mockResolvedValue({ count: 1 });
      bookingUpdateManyMock.mockResolvedValue({ count: 1 });
      transactionMock.mockImplementation(
        async (callback: (tx: {
          payment: { updateMany: typeof paymentUpdateManyMock };
          booking: { updateMany: typeof bookingUpdateManyMock };
        }) => Promise<unknown>) =>
          callback({
            payment: { updateMany: paymentUpdateManyMock },
            booking: { updateMany: bookingUpdateManyMock },
          }),
      );

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: true,
            data: {
              id: 123,
              status: "success",
              reference,
              amount: 240000,
              currency: "ZAR",
              metadata: {
                paymentId: "payment-test-1",
                bookingId,
                userId: "user-test-1",
              },
            },
          }),
        }),
      );

      const response = await request(app)
        .get(`/api/v1/payments/reference/${reference}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body.data.paymentStatus).toBe("SUCCEEDED");
      expect(response.body.data.booking.status).toBe("CONFIRMED");
      expect(paymentUpdateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "payment-test-1",
            status: "PENDING",
            providerPaymentId: reference,
          },
          data: { status: "SUCCEEDED" },
        }),
      );
      expect(bookingUpdateManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: bookingId, status: "PENDING" },
          data: { status: "CONFIRMED" },
        }),
      );
    });
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
const response = await request(app)
  .get("/api/v1/bookings/user/user-test-1")
  .set(authHeader());
    
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
    transactionMock.mockImplementation(
  async (callback: (tx: {
    booking: { create: typeof bookingCreateMock };
    payment: { create: typeof paymentCreateMock };
  }) => Promise<unknown>) =>
    callback({
      booking: {
        create: bookingCreateMock,
      },
      payment: {
        create: paymentCreateMock,
      },
    }),
);

paymentCreateMock.mockResolvedValue({
  id: "payment-test-1",
  bookingId: "booking-test-2",
  amount: 2400,
  currency: "ZAR",
 provider: "paystack",
  status: "PENDING",
});

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: "https://checkout.paystack.com/test-reference",
        reference: "GA-payment-test-1",
      },
    }),
  }),
);
roomFindUniqueMock.mockResolvedValue({
  id: "room-test-1",
  pricePerNight: 1200,
  totalRooms: 10,
});
userFindUniqueMock.mockResolvedValue({
  id: "user-test-1",
});

    bookingCreateMock.mockResolvedValue({
      id: "booking-test-2",
      userId: "user-test-1",
      roomTypeId: "room-test-1",
     checkIn: new Date("2026-11-03T00:00:00.000Z"),
checkOut: new Date("2026-11-05T00:00:00.000Z"),
      adults: 2,
      children: 0,
      roomQuantity: 1,
      totalPrice: 2400,
      status: "PENDING",
    });

    const response = await request(app)
  .post("/api/v1/bookings")
  .set(authHeader())
  .send({
    userId: "user-test-1",
    roomTypeId: "room-test-1",
    checkIn: "2026-11-03",
    checkOut: "2026-11-05",
    adults: 2,
    children: 0,
    roomQuantity: 1,
  });
    expect(response.status).toBe(201);
expect(response.body.success).toBe(true);

expect(bookingCreateMock).toHaveBeenCalledOnce();
expect(paymentCreateMock).toHaveBeenCalledOnce();
expect(transactionMock).toHaveBeenCalledOnce();

expect(response.body.checkoutUrl).toBe(
  "https://checkout.paystack.com/test-reference",
);

expect(response.body.paymentId).toBe("payment-test-1");

  });

// Additional test cases for booking creation and cancellation  
  it("rejects a booking with a check-in date in the past", async () => {
    const response = await request(app)
      .post("/api/v1/bookings")
      .set(authHeader())
      .send({
        roomTypeId: "room-test-1",
        checkIn: "2000-01-01",
        checkOut: "2000-01-03",
        adults: 2,
        children: 0,
        roomQuantity: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Check-in date cannot be in the past",
    );
    expect(roomFindUniqueMock).not.toHaveBeenCalled();
    expect(bookingCreateMock).not.toHaveBeenCalled();
  });

  // Additional test cases for booking cancellation
  
  it("rejects an invalid calendar date", async () => {
    const response = await request(app)
      .post("/api/v1/bookings")
      .set(authHeader())
      .send({
        roomTypeId: "room-test-1",
        checkIn: "2027-02-30",
        checkOut: "2027-03-03",
        adults: 2,
        children: 0,
        roomQuantity: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(
      "valid dates in YYYY-MM-DD format",
    );
    expect(roomFindUniqueMock).not.toHaveBeenCalled();
    expect(bookingCreateMock).not.toHaveBeenCalled();
  });

  // Additional test cases for booking cancellation
  
  it("rejects a booking that exceeds room guest capacity", async () => {
    roomFindUniqueMock.mockResolvedValue({
      id: "room-test-1",
      name: "Standard Room",
      capacity: 2,
      pricePerNight: 1203,
      totalRooms: 10,
    });

    const response = await request(app)
      .post("/api/v1/bookings")
      .set(authHeader())
      .send({
        roomTypeId: "room-test-1",
        checkIn: "2099-01-10",
        checkOut: "2099-01-12",
        adults: 3,
        children: 0,
        roomQuantity: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("maximum of 2 guest(s)");
    expect(roomFindUniqueMock).toHaveBeenCalledOnce();
    expect(bookingCreateMock).not.toHaveBeenCalled();
  });
// Additional test cases for booking cancellation

  it("rejects a booking when there are not enough rooms available", async () => {
    roomFindUniqueMock.mockResolvedValue({
      id: "room-test-1",
      name: "Standard Room",
      capacity: 2,
      pricePerNight: 1203,
      totalRooms: 10,
    });

    bookingFindManyMock.mockResolvedValue([
      {
        checkIn: new Date("2099-01-10T00:00:00.000Z"),
        checkOut: new Date("2099-01-12T00:00:00.000Z"),
        roomQuantity: 9,
      },
    ]);

    const response = await request(app)
      .post("/api/v1/bookings")
      .set(authHeader())
      .send({
        roomTypeId: "room-test-1",
        checkIn: "2099-01-10",
        checkOut: "2099-01-12",
        adults: 2,
        children: 0,
        roomQuantity: 2,
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Only 1 room(s) available");
    expect(bookingCreateMock).not.toHaveBeenCalled();
  });
// Additional test cases for booking cancellation

  it("calculates availability correctly for bookings on different nights", async () => {
    roomFindUniqueMock.mockResolvedValue({
      id: "room-test-1",
      name: "Standard Room",
      capacity: 2,
      pricePerNight: 1203,
      totalRooms: 10,
    });

    bookingFindManyMock.mockResolvedValue([
      {
        checkIn: new Date("2099-01-10T00:00:00.000Z"),
        checkOut: new Date("2099-01-11T00:00:00.000Z"),
        roomQuantity: 6,
      },
      {
        checkIn: new Date("2099-01-11T00:00:00.000Z"),
        checkOut: new Date("2099-01-12T00:00:00.000Z"),
        roomQuantity: 6,
      },
    ]);

    const response = await request(app)
      .post("/api/v1/bookings")
      .set(authHeader())
      .send({
        roomTypeId: "room-test-1",
        checkIn: "2099-01-10",
        checkOut: "2099-01-12",
        adults: 2,
        children: 0,
        roomQuantity: 5,
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("Only 4 room(s) available");
    expect(bookingCreateMock).not.toHaveBeenCalled();
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
const response = await request(app)
  .patch("/api/v1/bookings/booking-test-1/cancel")
  .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(bookingFindUniqueMock).toHaveBeenCalledOnce();
    expect(bookingUpdateMock).toHaveBeenCalledOnce();
  });
it("rejects cancellation of an already cancelled booking", async () => {
  bookingFindUniqueMock.mockResolvedValue({
    id: "booking-test-1",
    userId: "user-test-1",
    status: "CANCELLED",
  });

const response = await request(app)
  .patch("/api/v1/bookings/booking-test-1/cancel")
  .set(authHeader());

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(bookingUpdateMock).not.toHaveBeenCalled();
});

it("rejects cancellation of a completed booking", async () => {
  bookingFindUniqueMock.mockResolvedValue({
    id: "booking-test-1",
    userId: "user-test-1",
    status: "COMPLETED",
  });

 const response = await request(app)
  .patch("/api/v1/bookings/booking-test-1/cancel")
  .set(authHeader());

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(bookingUpdateMock).not.toHaveBeenCalled();
});

it("returns 404 when cancelling a booking that does not exist", async () => {
  bookingFindUniqueMock.mockResolvedValue(null);
const response = await request(app)
  .patch("/api/v1/bookings/nonexistent-booking/cancel")
  .set(authHeader());

  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
  expect(bookingUpdateMock).not.toHaveBeenCalled();
});

});

describe("Branch reviews API", () => {
  const branchId = "50cb4a8d-4c79-4f34-8894-2a6ca1214c99";
  const hotelId = "f98c742f-6cec-4cf5-b8bd-60af5796ce9a";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reviews for only the requested branch", async () => {
    branchFindUniqueMock.mockResolvedValue({ id: branchId });
    reviewFindManyMock.mockResolvedValue([
      { id: "review-1", rating: 5, user: { id: "user-1", name: "Guest" } },
    ]);

    const response = await request(app).get(
      `/api/v1/reviews/branch/${branchId}`,
    );

    expect(response.status).toBe(200);
    expect(reviewFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { branchId } }),
    );
    expect(response.body.count).toBe(1);
    expect(response.body.averageRating).toBe(5);
  });

  it("creates or updates a review for the selected branch only", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "user-test-1",
      role: "GUEST",
    });
    branchFindUniqueMock.mockResolvedValue({ id: branchId, hotelId });
    reviewUpsertMock.mockResolvedValue({
      id: "review-1",
      rating: 4,
      comment: "Lovely stay",
      user: { id: "user-test-1", name: "Guest" },
    });

    const response = await request(app)
      .post(`/api/v1/reviews/branch/${branchId}`)
      .set(authHeader())
      .send({ rating: 4, comment: "Lovely stay" });

    expect(response.status).toBe(200);
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_branchId: {
            userId: "user-test-1",
            branchId,
          },
        },
        create: expect.objectContaining({ hotelId, branchId }),
      }),
    );
  });
});


export async function createBooking(
  booking: CreateBookingInput,
  token: string,
): Promise<BookingResponse> {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(booking),
  });

  const result: BookingResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to create booking. Please try again.",
    );
  }

  return result;
}

export type UserBooking = {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number | string;
  status: string;
  roomQuantity: number;
  roomType: {
    name: string;
    branch: {
      name: string;
      hotel: {
        name: string;
      };
    };
  };
};

export async function getUserBookings(
  userId: string,
  token: string,
): Promise<UserBooking[]> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/user/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: {
    success: boolean;
    data?: UserBooking[];
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to load your bookings.");
  }

  return result.data ?? [];
}

export async function cancelBooking(
  bookingId: string,
  token: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/${bookingId}/cancel`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: {
    success: boolean;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to cancel booking.");
  }

  return {
    success: true,
    message: result.message || "Booking cancelled successfully.",
  };
}

const API_BASE_URL = "http://localhost:3000/api/v1";
export type CreateBookingInput = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomQuantity: number;
  roomTypeId: string;
};

export type BookingResponse = {
  success: boolean;
  data?: {
    id: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number | string;
    roomTypeId: string;
    userId: string;
  };
  message?: string;
};

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type AuthResponse = {
  message: string;
  token?: string;
  user?: AuthUser;
  error?: string;
};

async function authRequest(
  endpoint: string,
  data: Record<string, string>,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Something went wrong. Please try again.");
  }

  return result;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  title: string,
): Promise<AuthResponse> {
  return authRequest("register", { name, email, password, title });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return authRequest("login", { email, password });
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to connect to the Hotel Booking API");
  }

  return response.json();
}

export type AdminBooking = {
  id: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomQuantity: number;
  totalPrice: number | string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    title: string | null;
  };
  roomType: {
    id: string;
    name: string;
    capacity: number;
    pricePerNight: number | string;
    branch: {
      id: string;
      name: string;
      address: string;
      city: string;
      hotel: {
        id: string;
        name: string;
      };
    };
  };
  payments: {
    id: string;
    amount: number | string;
    currency: string;
    status: string;
    provider: string;
  }[];
};

export async function getAdminBookings(
  token: string,
): Promise<AdminBooking[]> {
  const response = await fetch(`${API_BASE_URL}/bookings/admin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result: {
    success: boolean;
    data?: AdminBooking[];
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to load reservations.");
  }

  return result.data ?? [];
}

export async function updateAdminBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "CANCELLED",
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/admin/${encodeURIComponent(bookingId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    },
  );

  const result: {
    success: boolean;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to update reservation.");
  }
}

export async function modifyAdminBooking(
  bookingId: string,
  changes: {
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    roomQuantity?: number;
  },
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/admin/${encodeURIComponent(bookingId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(changes),
    },
  );

  const result: {
    success: boolean;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to modify reservation.");
  }
}

export type FavoriteHotel = {
  hotelId: string;
  hotel: {
    id: string;
    name: string;
    description?: string | null;
  };
};

export async function getFavoriteHotels(
  token: string,
): Promise<FavoriteHotel[]> {
  const response = await fetch(`${API_BASE_URL}/favorites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result: {
    success: boolean;
    data?: FavoriteHotel[];
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to load favorites.");
  }

  return result.data ?? [];
}

export async function addFavoriteHotel(
  hotelId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/favorites/${encodeURIComponent(hotelId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: {
    success: boolean;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to add favorite.");
  }
}

export async function removeFavoriteHotel(
  hotelId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/favorites/${encodeURIComponent(hotelId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: {
    success: boolean;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to remove favorite.");
  }
}

export type HotelReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
};

export type HotelReviewsResponse = {
  success: boolean;
  count: number;
  averageRating: number | null;
  data: HotelReview[];
  message?: string;
};

export async function getHotelReviews(
  hotelId: string,
): Promise<HotelReviewsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/reviews/hotel/${encodeURIComponent(hotelId)}`,
  );

  const result: HotelReviewsResponse = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to load hotel reviews.");
  }

  return result;
}

export async function submitHotelReview(
  hotelId: string,
  rating: number,
  comment: string,
  token: string,
): Promise<HotelReview> {
  const response = await fetch(
    `${API_BASE_URL}/reviews/hotel/${encodeURIComponent(hotelId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, comment }),
    },
  );

  const result: {
    success: boolean;
    data?: HotelReview;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Failed to save your review.");
  }

  return result.data;
}

export { API_BASE_URL };

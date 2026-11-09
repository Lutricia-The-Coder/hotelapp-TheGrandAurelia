
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

export type CancellationResult = {
  success: boolean;
  message: string;
  refundPending: boolean;
  bookingStatus: string;
  paymentStatus: string | null;
};

export async function cancelBooking(
  bookingId: string,
  token: string,
): Promise<CancellationResult> {
  const response = await fetch(
    `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/cancel`,
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
    data?: {
      refundPending?: boolean;
      bookingStatus?: string;
      paymentStatus?: string | null;
    };
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to cancel booking.");
  }

  return {
    success: true,
    message: result.message || "Cancellation request processed.",
    refundPending: result.data?.refundPending ?? false,
    bookingStatus: result.data?.bookingStatus ?? "PENDING",
    paymentStatus: result.data?.paymentStatus ?? null,
  };
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
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
    status?: string;
  };
  checkoutUrl?: string;
  paymentId?: string;
  message?: string;
};

export type PaymentStatusResult = {
  paymentStatus: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number | string;
    roomTypeId: string;
    userId: string;
    status: string;
  };
};

export async function getPaymentStatus(
  reference: string,
  token: string,
): Promise<PaymentStatusResult> {
  const response = await fetch(
    `${API_BASE_URL}/payments/reference/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: {
    success: boolean;
    data?: PaymentStatusResult;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(
      result.message || "Unable to retrieve payment status.",
    );
  }

  return result.data;
}

export async function cancelPendingCheckout(
  bookingId: string,
  token: string,
): Promise<{ reference: string }> {
  const response = await fetch(
    `${API_BASE_URL}/payments/bookings/${encodeURIComponent(bookingId)}/cancel-checkout`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result: {
    success: boolean;
    data?: { reference: string };
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(
      result.message || "Unable to cancel pending checkout.",
    );
  }

  return result.data;
}

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};
export type UserProfile = {
  id: string;
  name: string | null;
  title: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
hasPassword: boolean;
};

export type UpdateProfileInput = {
  name: string | null;
  title: string | null;
};

export async function getMyProfile(
  token: string,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result: {
    success: boolean;
    data?: UserProfile;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Unable to load your profile.");
  }

  return result.data;
}

export async function updateMyProfile(
  updates: UpdateProfileInput,
  token: string,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  const result: {
    success: boolean;
    data?: UserProfile;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Unable to update your profile.");
  }

  return result.data;
}
export async function changeMyPassword(
  input: {
    currentPassword?: string;
    newPassword: string;
    confirmNewPassword: string;
  },
  token: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/users/me/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const result: {
    success: boolean;
    message: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to change your password.");
  }

  return result;
}
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
): Promise<{ message: string; refundPending: boolean }> {
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
    data?: {
      refundPending?: boolean;
    };
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to update reservation.");
  }

  return {
    message: result.message || "Reservation updated.",
    refundPending: result.data?.refundPending ?? false,
  };
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

export type FavoriteBranch = {
  userId: string;
  branchId: string;
  createdAt: string;
  branch: {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    images: string[];
    coverImage: string | null;
    hotel: {
      id: string;
      name: string;
      description: string | null;
    };
  };
};

export async function getFavoriteBranches(
  token: string,
): Promise<FavoriteBranch[]> {
  const response = await fetch(`${API_BASE_URL}/favorites/branches`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result: {
    success: boolean;
    data?: FavoriteBranch[];
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to load favorites.");
  }

  return result.data ?? [];
}

export async function addFavoriteBranch(
  branchId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/favorites/branches/${encodeURIComponent(branchId)}`,
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

export async function removeFavoriteBranch(
  branchId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/favorites/branches/${encodeURIComponent(branchId)}`,
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



import { useEffect, useState } from "react";
import {
  API_BASE_URL,createBooking,getUserBookings, cancelBooking,loginUser,registerUser,getAdminBookings,
  updateAdminBookingStatus, modifyAdminBooking,getFavoriteHotels, addFavoriteHotel,removeFavoriteHotel,type UserBooking,getHotelReviews,submitHotelReview,type HotelReviewsResponse,type AdminBooking,type FavoriteHotel,} from "./api";
import "./index.css";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store/store";
import { setUser, clearUser } from "./store/authSlice";

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
};

type RoomType = {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  pricePerNight: number;
  totalRooms: number;
};

type Hotel = {
  id: string;
  name: string;
  description?: string | null;
};

function App() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [branches, setBranches] = useState<Record<string, Branch[]>>({});
  const [rooms, setRooms] = useState<Record<string, RoomType[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const dispatch = useDispatch<AppDispatch>();

const authUser = useSelector(
  (state: RootState) => state.auth.user,
);

  const [authName, setAuthName] = useState("");
const [authEmail, setAuthEmail] = useState("");
const [authTitle, setAuthTitle] = useState("");
const [authConfirmPassword, setAuthConfirmPassword] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authMessage, setAuthMessage] = useState("");
const [authError, setAuthError] = useState("");
const [authLoading, setAuthLoading] = useState(false);
const [bookingRoom, setBookingRoom] = useState<RoomType | null>(null);
const [bookingCheckIn, setBookingCheckIn] = useState("");
const [bookingCheckOut, setBookingCheckOut] = useState("");
const [bookingAdults, setBookingAdults] = useState(1);
const [bookingChildren, setBookingChildren] = useState(0);
const [bookingQuantity, setBookingQuantity] = useState(1);
const [bookingMessage, setBookingMessage] = useState("");
const [bookingError, setBookingError] = useState("");
const [bookingLoading, setBookingLoading] = useState(false);

const [myBookings, setMyBookings] = useState<UserBooking[]>([]);
const [myBookingsLoading, setMyBookingsLoading] = useState(false);
const [myBookingsError, setMyBookingsError] = useState("");

const [bookingConfirmation, setBookingConfirmation] = useState<{
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number | string;
  roomTypeId: string;
  userId: string;
} | null>(null);

const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
const [showMyBookings, setShowMyBookings] = useState(false);

const [adminBookings, setAdminBookings] = useState<AdminBooking[]>([]);
const [adminBookingsLoading, setAdminBookingsLoading] = useState(false);
const [adminBookingsError, setAdminBookingsError] = useState("");
const [adminBookingsMessage, setAdminBookingsMessage] = useState("");
const [adminActionBookingId, setAdminActionBookingId] = useState<string | null>(null);
const [showAdminBookings, setShowAdminBookings] = useState(false);

const [favoriteHotelIds, setFavoriteHotelIds] = useState<string[]>([]);
const [favoriteHotels, setFavoriteHotels] = useState<FavoriteHotel[]>([]);
const [favoritesLoading, setFavoritesLoading] = useState(false);
const [favoritesError, setFavoritesError] = useState("");
const [favoritesMessage, setFavoritesMessage] = useState("");
const [favoriteActionHotelId, setFavoriteActionHotelId] = useState<string | null>(null);
const [showFavorites, setShowFavorites] = useState(false);
const [hotelReviews, setHotelReviews] = useState<
  Record<string, HotelReviewsResponse>
>({});
const [reviewsOpen, setReviewsOpen] = useState<Record<string, boolean>>({});
const [reviewsLoadingHotelId, setReviewsLoadingHotelId] = useState<string | null>(null);
const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
const [reviewMessages, setReviewMessages] = useState<Record<string, string>>({});
const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
const [reviewSubmittingHotelId, setReviewSubmittingHotelId] = useState<string | null>(null);

async function handleLoadAdminBookings() {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAdminBookingsError("Please sign in again.");
    return;
  }

  setShowAdminBookings(true);
  setAdminBookingsLoading(true);
  setAdminBookingsError("");
  setAdminBookingsMessage("");

  try {
    const bookings = await getAdminBookings(token);
    setAdminBookings(bookings);
  } catch (err) {
    setAdminBookingsError(
      err instanceof Error
        ? err.message
        : "Failed to load reservations.",
    );
  } finally {
    setAdminBookingsLoading(false);
  }
}

async function handleAdminBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "CANCELLED",
) {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAdminBookingsError("Please sign in again.");
    return;
  }

  const action = status === "CONFIRMED" ? "confirm" : "cancel";

  if (!window.confirm(`Are you sure you want to ${action} this reservation?`)) {
    return;
  }

  setAdminActionBookingId(bookingId);
  setAdminBookingsError("");
  setAdminBookingsMessage("");

  try {
    await updateAdminBookingStatus(bookingId, status, token);

    const bookings = await getAdminBookings(token);
    setAdminBookings(bookings);
    setAdminBookingsMessage(
      status === "CONFIRMED"
        ? "Reservation confirmed successfully."
        : "Reservation cancelled successfully.",
    );
  } catch (err) {
    setAdminBookingsError(
      err instanceof Error
        ? err.message
        : "Failed to update reservation.",
    );
  } finally {
    setAdminActionBookingId(null);
  }
}

async function handleModifyAdminBooking(booking: AdminBooking) {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAdminBookingsError("Please sign in again.");
    return;
  }

  const checkIn = window.prompt(
    "Check-in date (YYYY-MM-DD):",
    booking.checkIn.slice(0, 10),
  );
  if (checkIn === null) return;

  const checkOut = window.prompt(
    "Check-out date (YYYY-MM-DD):",
    booking.checkOut.slice(0, 10),
  );
  if (checkOut === null) return;

  const adultsText = window.prompt("Number of adults:", String(booking.adults));
  if (adultsText === null) return;

  const childrenText = window.prompt(
    "Number of children:",
    String(booking.children),
  );
  if (childrenText === null) return;

  const quantityText = window.prompt(
    "Number of rooms:",
    String(booking.roomQuantity),
  );
  if (quantityText === null) return;

  const adults = Number(adultsText);
  const children = Number(childrenText);
  const roomQuantity = Number(quantityText);

  if (
    !Number.isInteger(adults) ||
    adults < 1 ||
    !Number.isInteger(children) ||
    children < 0 ||
    !Number.isInteger(roomQuantity) ||
    roomQuantity < 1
  ) {
    setAdminBookingsError(
      "Enter valid whole numbers for guests and room quantity.",
    );
    return;
  }

  setAdminActionBookingId(booking.id);
  setAdminBookingsError("");
  setAdminBookingsMessage("");

  try {
    await modifyAdminBooking(
      booking.id,
      { checkIn, checkOut, adults, children, roomQuantity },
      token,
    );

    const bookings = await getAdminBookings(token);
    setAdminBookings(bookings);
    setAdminBookingsMessage("Reservation updated successfully.");
  } catch (err) {
    setAdminBookingsError(
      err instanceof Error
        ? err.message
        : "Failed to modify reservation.",
    );
  } finally {
    setAdminActionBookingId(null);
  }
}
//favorites 

async function handleLoadFavorites() {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAuthMode("login");
    setAuthError("Please sign in to view your favorites.");
    document.getElementById("auth")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }
setShowFavorites(true);
  setFavoritesLoading(true);
  setFavoritesError("");
  setFavoritesMessage("");

  try {
    const saved = await getFavoriteHotels(token);
    setFavoriteHotels(saved);
    setFavoriteHotelIds(saved.map((favorite) => favorite.hotelId));
  
  } catch (err) {
    setFavoritesError(
      err instanceof Error ? err.message : "Failed to load favorites.",
    );
  } finally {
    setFavoritesLoading(false);
  }
}

async function handleToggleFavorite(hotel: Hotel) {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAuthMode("login");
    setAuthError("Please sign in to save hotels to your favorites.");
    document.getElementById("auth")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }

  setFavoriteActionHotelId(hotel.id);
  setFavoritesError("");
  setFavoritesMessage("");

  try {
    const isFavorite = favoriteHotelIds.includes(hotel.id);

    if (isFavorite) {
      await removeFavoriteHotel(hotel.id, token);
    } else {
      await addFavoriteHotel(hotel.id, token);
    }

    const saved = await getFavoriteHotels(token);

    setFavoriteHotels(saved);
    setFavoriteHotelIds(saved.map((favorite) => favorite.hotelId));
    setFavoritesMessage(
      isFavorite
        ? "Hotel removed from favorites."
        : "Hotel added to favorites.",
    );
  } catch (err) {
    setFavoritesError(
      err instanceof Error ? err.message : "Failed to update favorites.",
    );
  } finally {
    setFavoriteActionHotelId(null);
  }
}

async function handleLoadHotelReviews(hotelId: string) {
  setReviewsOpen((previous) => ({ ...previous, [hotelId]: true }));
  setReviewsLoadingHotelId(hotelId);
  setReviewErrors((previous) => ({ ...previous, [hotelId]: "" }));

  try {
    const result = await getHotelReviews(hotelId);

    setHotelReviews((previous) => ({
      ...previous,
      [hotelId]: result,
    }));
  } catch (err) {
    setReviewErrors((previous) => ({
      ...previous,
      [hotelId]: err instanceof Error
        ? err.message
        : "Failed to load reviews.",
    }));
  } finally {
    setReviewsLoadingHotelId(null);
  }
}

async function handleSubmitHotelReview(hotelId: string) {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAuthMode("login");
    setAuthError("Please sign in to submit a review.");
    document.getElementById("auth")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }

  setReviewSubmittingHotelId(hotelId);
  setReviewErrors((previous) => ({ ...previous, [hotelId]: "" }));
  setReviewMessages((previous) => ({ ...previous, [hotelId]: "" }));

  try {
    await submitHotelReview(
      hotelId,
      reviewRatings[hotelId] ?? 5,
      reviewComments[hotelId] ?? "",
      token,
    );

    const result = await getHotelReviews(hotelId);

    setHotelReviews((previous) => ({
      ...previous,
      [hotelId]: result,
    }));

    setReviewMessages((previous) => ({
      ...previous,
      [hotelId]: "Your review has been saved.",
    }));
  } catch (err) {
    setReviewErrors((previous) => ({
      ...previous,
      [hotelId]: err instanceof Error
        ? err.message
        : "Failed to save your review.",
    }));
  } finally {
    setReviewSubmittingHotelId(null);
  }
}


async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setAuthMessage("");
  setAuthError("");
  setAuthLoading(true);

  try {
    if (authMode === "register") {
      if (authPassword !== authConfirmPassword) {
  setAuthError("Your passwords do not match. Please try again.");
  setAuthLoading(false);
  return;
}
      const result = await registerUser(
      
        authName.trim(),
        authEmail.trim(),
        authPassword,
          authTitle,
      );

      setAuthMessage(result.message);
      setAuthMode("login");
      setAuthPassword("");
    } else if (authMode === "login") {
      const result = await loginUser(authEmail.trim(), authPassword);

      if (!result.token || !result.user) {
        throw new Error("Login response was incomplete. Please try again.");
      }
sessionStorage.setItem("hotelAuthToken", result.token);
sessionStorage.setItem("hotelAuthUser", JSON.stringify(result.user));
dispatch(setUser(result.user));

      setAuthMessage(`Welcome${result.user.name ? `, ${result.user.name}` : ""}! You are signed in.`);
      setAuthPassword("");
    }
  } catch (err) {
    setAuthError(
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again.",
    );
  } finally {
    setAuthLoading(false);
  }
}

async function handleLoadMyBookings() {
  setShowMyBookings(true);
  if (!authUser) {
    setMyBookingsError("Please sign in to view your bookings.");
    return;
  }

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setMyBookingsError("Your session has expired. Please sign in again.");
    return;
  }

  setMyBookingsLoading(true);
  setMyBookingsError("");

  try {
    const bookings = await getUserBookings(authUser.id, token);
    setMyBookings(bookings);
  } catch (error) {
    setMyBookingsError(
      error instanceof Error
        ? error.message
        : "Failed to load your bookings.",
    );
  } finally {
    setMyBookingsLoading(false);
  }
}

async function handleCancelBooking(bookingId: string) {
  const confirmed = window.confirm(
    "Are you sure you want to cancel this booking?",
  );

  if (!confirmed) return;

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setMyBookingsError("Your session has expired. Please sign in again.");
    return;
  }

  setCancellingBookingId(bookingId);
  setMyBookingsError("");

  try {
    await cancelBooking(bookingId, token);

    setMyBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: "CANCELLED" }
          : booking,
      ),
    );
  } catch (error) {
    setMyBookingsError(
      error instanceof Error
        ? error.message
        : "Failed to cancel booking.",
    );
  } finally {
    setCancellingBookingId(null);
  }
}

function handleSignOut() {
  sessionStorage.removeItem("hotelAuthToken");
  sessionStorage.removeItem("hotelAuthUser");

dispatch(clearUser());
  setAuthMode(null);
  setAuthMessage("");
  setAuthError("");
  setAuthPassword("");
  setAuthConfirmPassword("");
}

async function handleBookingSubmit(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  setBookingMessage("");
  setBookingError("");

  if (!authUser) {
    setBookingError("Please sign in before making a booking.");
    setAuthMode("login");
    return;
  }

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
dispatch(clearUser());
    setBookingError("Your session has expired. Please sign in again.");
    setAuthMode("login");
    return;
  }

  if (!bookingRoom) {
    setBookingError("Please select a room.");
    return;
  }

  if (bookingCheckOut <= bookingCheckIn) {
    setBookingError("Check-out must be after check-in.");
    return;
  }

  setBookingLoading(true);

  try {
    const result = await createBooking(
      {
        checkIn: bookingCheckIn,
        checkOut: bookingCheckOut,
        adults: bookingAdults,
        children: bookingChildren,
        roomQuantity: bookingQuantity,
        roomTypeId: bookingRoom.id,
      },
      token,
    );

    if (!result.success || !result.data) {
      throw new Error(result.message || "Booking could not be completed.");
    }
setBookingConfirmation(result.data);
    setBookingMessage(
      `Booking created successfully! Total: R${Number(result.data.totalPrice).toFixed(2)}`,
    );
  } catch (err) {
    setBookingError(
      err instanceof Error
        ? err.message
        : "Something went wrong while creating your booking.",
    );
  } finally {
    setBookingLoading(false);
  }
}

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`${API_BASE_URL}/hotels`);
        if (!response.ok) throw new Error("Failed to load hotels");

        const result = await response.json();
        const hotelList: Hotel[] = result.data ?? [];
        setHotels(hotelList);

        const branchResults = await Promise.all(
          hotelList.map(async (hotel) => {
            const branchResponse = await fetch(
              `${API_BASE_URL}/branches/hotel/${hotel.id}`,
            );
            if (!branchResponse.ok) throw new Error("Failed to load branches");

            const branchResult = await branchResponse.json();
            return [hotel.id, branchResult.data ?? []] as const;
          }),
        );

        const branchMap = Object.fromEntries(branchResults) as Record<
          string,
          Branch[]
        >;
        setBranches(branchMap);

        const allBranches = Object.values(branchMap).flat();

        const roomResults = await Promise.all(
          allBranches.map(async (branch) => {
            const roomResponse = await fetch(
              `${API_BASE_URL}/rooms/branch/${branch.id}`,
            );
            if (!roomResponse.ok) throw new Error("Failed to load rooms");

            const roomResult = await roomResponse.json();
            return [branch.id, roomResult.data ?? []] as const;
          }),
        );

        setRooms(Object.fromEntries(roomResults));
      } catch {
        setError("We couldn't load our stays. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const allBranches = Object.values(branches).flat();
  const allRooms = Object.values(rooms).flat();
  const lowestPrice = allRooms.length
    ? Math.min(...allRooms.map((room) => room.pricePerNight))
    : null;

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="The Grand Aurelia home">
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>THE GRAND AURELIA</strong>
            <small>A STAY BEYOND EXPECTATIONS</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-active" href="#home">Home</a>
          <a href="#destinations">Destinations</a>
          <a href="#rooms">Our Rooms</a>
          <a href="#about">Our Story</a>
        </nav>


<div className="header-actions">
 
{authUser ? (
  <>
    <span className="login-link">
      Welcome, {authUser.name || authUser.email}
    </span>

    <button
      type="button"
      className="login-link sign-out-button"
      onClick={async () => {
        await handleLoadMyBookings();

        document.getElementById("my-bookings")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
      disabled={myBookingsLoading}
    >
      {myBookingsLoading ? "Loading bookings..." : "My Bookings"}
    </button>


<button
  type="button"
  className="login-link sign-out-button"
  onClick={async () => {
    if (showFavorites) {
      setShowFavorites(false);
    } else {
      await handleLoadFavorites();

      window.requestAnimationFrame(() => {
        document.getElementById("favorite-hotels")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }}
  disabled={favoritesLoading}
>
  {favoritesLoading
    ? "Loading Favourites..."
    : showFavorites
      ? "Hide Favourites"
      : "My Favourites"}
</button>

    {/* ADD THE ADMIN BUTTON HERE */}
    {authUser.role === "ADMIN" && (
      <button
        type="button"
        className="login-link sign-out-button"
        onClick={async () => {
          if (showAdminBookings) {
            setShowAdminBookings(false);
          } else {
            await handleLoadAdminBookings();
          }
        }}
        disabled={adminBookingsLoading}
      >
        {adminBookingsLoading
          ? "Loading reservations..."
          : showAdminBookings
            ? "Hide Admin Reservations"
            : "Admin Reservations"}
      </button>
    )}

    <button
      type="button"
      className="login-link sign-out-button"
      onClick={handleSignOut}
    >
      Sign out
    </button>
  </>
) : (
  <a
    className="login-link"
    href="#auth"
    onClick={(event) => {
      event.preventDefault();
      setAuthMode("login");
    }}
  >
    Sign in
  </a>
)}

  <a className="header-cta" href="#rooms">
    Explore Stays <span>↗</span>
  </a>
</div>


      </header>

      <main>
        
{authMode !== null && (
  <section className="auth-section" id="auth">
    <div className="auth-card">
      <button
        type="button"
        className="auth-close"
        onClick={() => {
          setAuthMode(null);
          setAuthMessage("");
          setAuthError("");
        }}
        aria-label="Close authentication form"
      >
        ×
      </button>

      <p className="eyebrow">
        <span /> THE GRAND AURELIA
      </p>

      <h2>
        {authMode === "login" ? (
          <>Welcome <em>back.</em></>
        ) : (
          <>Create your <em>account.</em></>
        )}
      </h2>

      <p className="auth-description">
        {authMode === "login"
          ? "Sign in to continue your journey with us."
          : "Join us and make your next stay special."}
      </p>

      <form onSubmit={handleAuthSubmit}>
  
{authMode === "register" && (
  <>
    <label className="auth-label">
      Title
      <select
        value={authTitle}
        onChange={(event) => setAuthTitle(event.target.value)}
        required
      >
        <option value="">Select your title</option>
        <option value="Mr">Mr</option>
        <option value="Mrs">Mrs</option>
        <option value="Ms">Ms</option>
        <option value="Miss">Miss</option>
        <option value="Dr">Dr</option>
        <option value="Prof">Prof</option>
      </select>
    </label>

    <label className="auth-label">
      Full name
      <input
        type="text"
        value={authName}
        onChange={(event) => setAuthName(event.target.value)}
        autoComplete="name"
        placeholder="Your full name"
        maxLength={100}
        required
      />
    </label>
  </>
)}


        <label className="auth-label">
          Email address
          <input
            type="email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="auth-label">
          Password
          <input
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            placeholder={authMode === "register" ? "At least 8 characters" : "Your password"}
            minLength={authMode === "register" ? 8 : undefined}
            required
          />
        </label>

{authMode === "register" && (
  <label className="auth-label">
    Confirm password
    <input
      type="password"
      value={authConfirmPassword}
      onChange={(event) => setAuthConfirmPassword(event.target.value)}
      autoComplete="new-password"
      placeholder="Enter your password again"
      minLength={8}
      required
    />
  </label>
)}

        {authError && (
          <p className="auth-feedback auth-feedback-error" role="alert">
            {authError}
          </p>
        )}

        {authMessage && (
          <p className="auth-feedback auth-feedback-success" role="status">
            {authMessage}
          </p>
        )}

        <button
          type="submit"
          className="gold-button auth-submit"
          disabled={authLoading}
        >
          {authLoading
            ? "Please wait..."
            : authMode === "login"
              ? "Sign in"
              : "Create account"}
          {!authLoading && <span>→</span>}
        </button>
      </form>

      <p className="auth-switch">
        {authMode === "login"
          ? "New to The Grand Aurelia?"
          : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setAuthMode(authMode === "login" ? "register" : "login");
            setAuthMessage("");
            setAuthError("");
            setAuthConfirmPassword("");
          }}
        >
          {authMode === "login" ? "Create account" : "Sign in"}
        </button>
      </p>
    </div>
  </section>
)}

        <section className="hero" id="home">
          <div className="hero-image" role="img" aria-label="Peaceful luxury lodge surrounded by nature" />
          <div className="hero-shade" />

          <div className="hero-content">
            <p className="eyebrow hero-eyebrow">
              <span /> YOUR SANCTUARY IN MPUMALANGA
            </p>
            <h1>Where every stay<br />becomes a <em>story.</em></h1>
            <p className="hero-description">
              Discover thoughtful comfort, warm hospitality, and a place
              to slow down and feel at home.
            </p>
            <a className="gold-button" href="#destinations">
              Discover your stay <span>→</span>
            </a>
          </div>

          <div className="hero-caption">
            <span className="caption-line" />
            <span>MPUMALANGA, SOUTH AFRICA</span>
          </div>

          <div className="hero-index"><strong>01</strong> / 03</div>
        </section>

        <section className="search-section" aria-label="Find a stay">
          <div className="search-intro">
            <span className="search-icon">⌕</span>
            <div>
              <strong>Find your escape</strong>
              <span>Begin with a destination</span>
            </div>
          </div>
          <a className="search-field" href="#destinations">
            <span className="field-label">DESTINATION</span>
            <strong>Mbombela, South Africa</strong>
          </a>
          <a className="search-field" href="#rooms">
            <span className="field-label">YOUR STAY</span>
            <strong>Explore available rooms</strong>
          </a>
          <a className="search-button" href="#rooms">Explore stays <span>→</span></a>
        </section>

        <section className="welcome-section" id="about">
          <div className="welcome-copy">
            <p className="eyebrow"><span /> WELCOME TO THE GRAND AURELIA</p>
            <h2>A little more than<br />a place to <em>stay.</em></h2>
          </div>
          <div className="welcome-description">
            <p>
              Some places simply make you feel different. At The Grand Aurelia,
              we believe a memorable stay is made from the little things:
              considered spaces, genuine hospitality, and room to breathe.
            </p>
            <a className="text-link" href="#destinations">
              Get to know us <span>↗</span>
            </a>
          </div>
          <div className="welcome-number">01 <span>— OUR PHILOSOPHY</span></div>
        </section>

        <section className="destinations-section" id="destinations">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span /> FIND YOUR PLACE</p>
              <h2>Our <em>destinations.</em></h2>
            </div>
            <p className="section-note">
              A welcoming place to return to,<br />wherever your journey takes you.
            </p>
          </div>

          {loading && <p className="status-message">Discovering our stays...</p>}
          {error && <p className="status-message error-message" role="alert">{error}</p>}

          {!loading && !error && hotels.length === 0 && (
            <p className="status-message">Our stays are coming soon.</p>
          )}
{favoritesError && (
  <p className="status-message error-message" role="alert">
    Favourites error: {favoritesError}
  </p>
)}

{favoritesMessage && (
  <p className="status-message" role="status">
    {favoritesMessage}
  </p>
)}
          <div className="destination-grid">
            {hotels.map((hotel) => (
              <article className="destination-card" key={hotel.id}>
                <div className="destination-photo">
                  <div className="photo-overlay" />
                  <span className="photo-tag">OUR SIGNATURE STAY</span>
                  <span className="photo-count">
                    {(branches[hotel.id] ?? []).length} {(branches[hotel.id] ?? []).length === 1 ? "location" : "locations"}
                  </span>
                </div>
                <div className="destination-content">
                  <p className="eyebrow destination-eyebrow">SOUTH AFRICA · MPUMALANGA</p>
                  <h3>{hotel.name}</h3>
                  
<button
  type="button"
  className="login-link sign-out-button"
  aria-pressed={favoriteHotelIds.includes(hotel.id)}
  onClick={() => handleToggleFavorite(hotel)}
  disabled={favoriteActionHotelId === hotel.id}
>
  {favoriteActionHotelId === hotel.id
    ? "Saving..."
    : favoriteHotelIds.includes(hotel.id)
      ? "♥ Saved to Favourites"
      : "♡ Add to Favourites"}
</button>

                  <p className="destination-description">
                    {hotel.description || "A thoughtful stay, designed around you."}
                  </p>

<div className="hotel-reviews">
  <button
    type="button"
    className="login-link sign-out-button"
    onClick={() => {
      if (reviewsOpen[hotel.id]) {
        setReviewsOpen((previous) => ({
          ...previous,
          [hotel.id]: false,
        }));
      } else {
        void handleLoadHotelReviews(hotel.id);
      }
    }}
    disabled={reviewsLoadingHotelId === hotel.id}
  >
    {reviewsLoadingHotelId === hotel.id
      ? "Loading reviews..."
      : reviewsOpen[hotel.id]
        ? "Hide Reviews"
        : "Reviews & Ratings"}
  </button>

  {hotelReviews[hotel.id] && (
    <p>
      <strong>
        {hotelReviews[hotel.id].averageRating === null
          ? "Not rated yet"
          : `${hotelReviews[hotel.id].averageRating!.toFixed(1)} / 5 ★`}
      </strong>
      {" "}({hotelReviews[hotel.id].count} reviews)
    </p>
  )}

  {reviewsOpen[hotel.id] && (
    <div className="hotel-reviews-panel">
      {reviewErrors[hotel.id] && (
        <p role="alert">{reviewErrors[hotel.id]}</p>
      )}

      {reviewMessages[hotel.id] && (
        <p role="status">{reviewMessages[hotel.id]}</p>
      )}

      {hotelReviews[hotel.id]?.data.map((review) => (
        <article key={review.id} className="hotel-review-card">
          <p>
            <strong>{review.user.name || "Guest"}</strong>
            {" · "}
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </p>

          {review.comment && <p>{review.comment}</p>}

          <small>
            {new Date(review.createdAt).toLocaleDateString("en-ZA")}
          </small>
        </article>
      ))}

      {hotelReviews[hotel.id]?.count === 0 && (
        <p>No reviews yet. Be the first to share your experience.</p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmitHotelReview(hotel.id);
        }}
      >
        <label>
          Your rating
          <select
            value={reviewRatings[hotel.id] ?? 5}
            onChange={(event) =>
              setReviewRatings((previous) => ({
                ...previous,
                [hotel.id]: Number(event.target.value),
              }))
            }
          >
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Very good</option>
            <option value={3}>3 - Good</option>
            <option value={2}>2 - Fair</option>
            <option value={1}>1 - Poor</option>
          </select>
        </label>

        <label>
          Your review
          <textarea
            rows={3}
            maxLength={2000}
            value={reviewComments[hotel.id] ?? ""}
            onChange={(event) =>
              setReviewComments((previous) => ({
                ...previous,
                [hotel.id]: event.target.value,
              }))
            }
            placeholder="Share your experience..."
          />
        </label>

        <button
          type="submit"
          className="room-book-button"
          disabled={reviewSubmittingHotelId === hotel.id}
        >
          {reviewSubmittingHotelId === hotel.id
            ? "Submitting..."
            : "Submit Review"}
        </button>
      </form>
    </div>
  )}
</div>

                  {(branches[hotel.id] ?? []).map((branch) => (
                    <div className="branch-details" key={branch.id}>
                      <div className="branch-title-row">
                        <span className="location-dot" />
                        <strong>{branch.name}</strong>
                      </div>
                      <p>{branch.address}, {branch.city}, {branch.country}</p>
                      <a className="text-link" href="#rooms">
                        Explore this location <span>→</span>
                      </a>
                    </div>
                  ))}

                  <div className="destination-footer">
                    <div>
                      <span className="field-label">ROOMS FROM</span>
                      <strong className="starting-price">
                        {lowestPrice === null
                          ? "Enquire for rates"
                          : `R${lowestPrice.toLocaleString("en-ZA")}`}
                      </strong>
                      {lowestPrice !== null && <span className="per-night">per room / night</span>}
                    </div>
                    <a className="round-link" href="#rooms" aria-label={`Explore ${hotel.name} rooms`}>↗</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

{authUser && showFavorites && (
  <section
    id="favorite-hotels"
    className="my-bookings-section"
  >
    <h2>My Favourites</h2>
    <p>Your saved stays at The Grand Aurelia.</p>

    {favoritesError && (
      <p role="alert">{favoritesError}</p>
    )}

    {favoritesMessage && (
      <p role="status">{favoritesMessage}</p>
    )}

    {favoritesLoading && <p>Loading Favourites...</p>}

    {!favoritesLoading &&
      !favoritesError &&
      favoriteHotels.length === 0 && (
        <p>You haven't saved any hotels yet.</p>
      )}

    {!favoritesLoading &&
      favoriteHotels.map((favorite) => (
        <article
          key={favorite.hotelId}
          className="my-booking-card"
        >
          <h3>{favorite.hotel.name}</h3>

          <p>
            {favorite.hotel.description ||
              "A thoughtful stay, designed around you."}
          </p>

          <button
            type="button"
            className="login-link sign-out-button"
            disabled={favoriteActionHotelId === favorite.hotelId}
            onClick={() =>
              handleToggleFavorite({
                id: favorite.hotel.id,
                name: favorite.hotel.name,
                description: favorite.hotel.description,
              })
            }
          >
            {favoriteActionHotelId === favorite.hotelId
              ? "Removing..."
              : "Remove from Favourites"}
          </button>
        </article>
      ))}
  </section>
)}

        <section className="rooms-section" id="rooms">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span /> REST EASY</p>
              <h2>Spaces to call <em>your own.</em></h2>
            </div>
            <p className="section-note">
              Thoughtful comfort for quiet mornings<br />and well-earned rest.
            </p>
          </div>

          {!loading && allBranches.length === 0 && !error && (
            <p className="status-message">Room details will appear here soon.</p>
          )}

          <div className="room-grid">
            {allBranches.flatMap((branch) =>
              (rooms[branch.id] ?? []).map((room) => (
                <article className="room-card" key={room.id}>
                  <div className="room-photo">
                    <div className="room-photo-overlay" />
                    <span className="room-category">THE GRAND AURELIA</span>
                  </div>
                  <div className="room-card-body">
                    <div className="room-title-row">
                      <h3>{room.name}</h3>
                      <span className="room-capacity">♧ {room.capacity} guests</span>
                    </div>
                    <p>{room.description || "A welcoming room for a comfortable stay."}</p>
                    <div className="room-meta">
                      <span>{branch.city}</span>
                      <span>{room.totalRooms} rooms in inventory</span>
                    </div>
                    <div className="room-card-footer">
                      <div>
                        <strong className="room-price">R{room.pricePerNight.toLocaleString("en-ZA")}</strong>
                        <span className="per-night"> / night</span>
                      </div>
                    
<a
  className="room-book-button"
  href="#booking"
  onClick={(event) => {
    event.preventDefault();
    setBookingRoom(room);
    setBookingCheckIn("");
    setBookingCheckOut("");
    setBookingAdults(1);
    setBookingChildren(0);
    setBookingQuantity(1);
    setBookingMessage("");
    setBookingError("");
    document.getElementById("booking")?.scrollIntoView({
      behavior: "smooth",
    });
  }}
>
  Book now <span>→</span>
</a>

                    </div>
                  </div>
                </article>
              )),
            )}
          </div>
        </section>

        {bookingRoom && (
          <section className="auth-section" id="booking-form">
            <div className="auth-card booking-card">
              <button
                type="button"
                className="auth-close"
                onClick={() => {
                  setBookingRoom(null);
                  setBookingMessage("");
                  setBookingError("");
                }}
                aria-label="Close booking form"
              >
                ×
              </button>

              <p className="eyebrow">
                <span /> THE GRAND AURELIA
              </p>

              <h2>
                Book your <em>stay.</em>
              </h2>

              <p className="auth-description">
                {bookingRoom.name} · R
                {bookingRoom.pricePerNight.toLocaleString("en-ZA")} per night
              </p>

              <form onSubmit={handleBookingSubmit}>
                <label className="auth-label">
                  Check-in
                  <input
                    type="date"
                    value={bookingCheckIn}
                    onChange={(event) =>
                      setBookingCheckIn(event.target.value)
                    }
                    min={new Date().toLocaleDateString("en-CA")}
                    required
                  />
                </label>

                <label className="auth-label">
                  Check-out
                  <input
                    type="date"
                    value={bookingCheckOut}
                    onChange={(event) =>
                      setBookingCheckOut(event.target.value)
                    }
                    min={bookingCheckIn || new Date().toLocaleDateString("en-CA")}
                    required
                  />
                </label>

                <label className="auth-label">
                  Adults
                  <input
                    type="number"
                    min={1}
                    max={bookingRoom.capacity * bookingQuantity}
                    value={bookingAdults}
                    onChange={(event) =>
                      setBookingAdults(Number(event.target.value))
                    }
                    required
                  />
                </label>

                <label className="auth-label">
                  Children
                  <input
                    type="number"
                    min={0}
                    value={bookingChildren}
                    onChange={(event) =>
                      setBookingChildren(Number(event.target.value))
                    }
                    required
                  />
                </label>

                <label className="auth-label">
                  Rooms
                  <select
                    value={bookingQuantity}
                    onChange={(event) =>
                      setBookingQuantity(Number(event.target.value))
                    }
                    required
                  >
                    {Array.from(
                      { length: bookingRoom.totalRooms },
                      (_, index) => index + 1,
                    ).map((quantity) => (
                      <option key={quantity} value={quantity}>
                        {quantity} {quantity === 1 ? "room" : "rooms"}
                      </option>
                    ))}
                  </select>
                </label>

                {bookingCheckIn &&
                  bookingCheckOut &&
                  bookingCheckOut > bookingCheckIn && (
                    <p className="auth-description">
                      Estimated total: R
                      {(
                        bookingRoom.pricePerNight *
                        Math.round(
                          (new Date(`${bookingCheckOut}T00:00:00`).getTime() -
                            new Date(`${bookingCheckIn}T00:00:00`).getTime()) /
                            86400000,
                        ) *
                        bookingQuantity
                      ).toLocaleString("en-ZA")}
                    </p>
                  )}

                {bookingError && (
                  <p className="auth-feedback auth-feedback-error" role="alert">
                    {bookingError}
                  </p>
                )}

             
{bookingMessage && (
  <div className="booking-confirmation" role="status">
    <p className="auth-feedback auth-feedback-success">
      {bookingMessage}
    </p>

    {bookingConfirmation && (
      <div className="booking-confirmation-details">
        <h3>Booking Confirmation</h3>

        <p>
          <strong>Booking reference:</strong>{" "}
          {bookingConfirmation.id}
        </p>

        <p>
          <strong>Room:</strong>{" "}
          {bookingRoom?.name ?? "Selected room"}
        </p>

        <p>
          <strong>Check-in:</strong>{" "}
          {new Date(bookingConfirmation.checkIn).toLocaleDateString(
            "en-ZA",
          )}
        </p>

        <p>
          <strong>Check-out:</strong>{" "}
          {new Date(bookingConfirmation.checkOut).toLocaleDateString(
            "en-ZA",
          )}
        </p>

        <p>
          <strong>Rooms booked:</strong> {bookingQuantity}
        </p>

        <p>
          <strong>Total price:</strong>{" "}
          {Number(bookingConfirmation.totalPrice).toLocaleString(
            "en-ZA",
            {
              style: "currency",
              currency: "ZAR",
            },
          )}
        </p>
      </div>
    )}
  </div>
)}


                {!authUser && (
                  <p className="auth-description">
                    You'll need to sign in before confirming your booking.
                  </p>
                )}

                <button
                  type="submit"
                  className="gold-button auth-submit"
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Creating booking..." : "Confirm booking"}
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="closing-banner" id="booking">
          <div>
            <p className="eyebrow hero-eyebrow"><span /> YOUR NEXT CHAPTER STARTS HERE</p>
            <h2>Make room for<br /><em>something wonderful.</em></h2>
          </div>
          <a className="gold-button" href="#rooms">Find your stay <span>→</span></a>
        </section>
        
{showMyBookings && (
<section id="my-bookings" className="my-bookings-section">
      <h2>My Bookings</h2>
    <p>Your reservations at The Grand Aurelia.</p>

    {myBookingsLoading && <p>Loading your bookings...</p>}

    {myBookingsError && (
      <p role="alert">{myBookingsError}</p>
    )}

    {!myBookingsLoading &&
      !myBookingsError &&
      myBookings.length === 0 && (
        <p>You don't have any bookings yet.</p>
      )}

    {!myBookingsLoading &&
      !myBookingsError &&
      myBookings.map((booking) => (
        <article key={booking.id} className="my-booking-card">
          <h3>{booking.roomType.name}</h3>
          <p>
            Hotel: {booking.roomType.branch.hotel.name}
          </p>
          <p>
            Branch: {booking.roomType.branch.name}
          </p>
          <p>
            Check-in:{" "}
            {new Date(booking.checkIn).toLocaleDateString("en-ZA")}
          </p>
          <p>
            Check-out:{" "}
            {new Date(booking.checkOut).toLocaleDateString("en-ZA")}
          </p>
          <p>Rooms: {booking.roomQuantity}</p>
          <p>
            Total:{" "}
            {Number(booking.totalPrice).toLocaleString("en-ZA", {
              style: "currency",
              currency: "ZAR",
            })}
          </p>

<p
  className={`booking-status booking-status-${booking.status.toLowerCase()}`}
>
  Status:{" "}
  {booking.status === "PENDING"
    ? "Pending confirmation"
    : booking.status === "CONFIRMED"
      ? "Confirmed"
      : booking.status === "CANCELLED"
        ? "Cancelled"
        : booking.status === "COMPLETED"
          ? "Completed"
          : booking.status}
</p>
          
{booking.status !== "CANCELLED" &&
  booking.status !== "COMPLETED" && (
    <button
      type="button"
      className="login-link sign-out-button"
      onClick={() => handleCancelBooking(booking.id)}
      disabled={cancellingBookingId === booking.id}
    >
      {cancellingBookingId === booking.id
        ? "Cancelling..."
        : "Cancel Booking"}
    </button>
  )}

        </article>
      ))}
  </section>
)}

{authUser?.role === "ADMIN" && showAdminBookings && (
  <section id="admin-bookings" className="my-bookings-section">
    <h2>Admin Reservations</h2>
    <p>View and manage guest reservations at The Grand Aurelia.</p>

    {adminBookingsLoading && <p>Loading reservations...</p>}

    {adminBookingsError && (
      <p role="alert">{adminBookingsError}</p>
    )}

    {adminBookingsMessage && (
      <p role="status">{adminBookingsMessage}</p>
    )}

    {!adminBookingsLoading &&
      !adminBookingsError &&
      adminBookings.length === 0 && (
        <p>No reservations found.</p>
      )}

    {!adminBookingsLoading &&
      adminBookings.map((booking) => (
        <article key={booking.id} className="my-booking-card">
          <h3>{booking.roomType.branch.hotel.name}</h3>

          <p>
            <strong>Booking reference:</strong> {booking.id}
          </p>

          <p>
            <strong>Guest:</strong>{" "}
            {booking.user.name || "Guest"}
          </p>

          <p>
            <strong>Email:</strong> {booking.user.email}
          </p>

          <p>
            <strong>Room:</strong> {booking.roomType.name}
          </p>

          <p>
            <strong>Branch:</strong> {booking.roomType.branch.name}
          </p>

          <p>
            <strong>Address:</strong>{" "}
            {booking.roomType.branch.address},{" "}
            {booking.roomType.branch.city}
          </p>

          <p>
            <strong>Check-in:</strong>{" "}
            {new Date(booking.checkIn).toLocaleDateString("en-ZA")}
          </p>

          <p>
            <strong>Check-out:</strong>{" "}
            {new Date(booking.checkOut).toLocaleDateString("en-ZA")}
          </p>

          <p>
            <strong>Adults:</strong> {booking.adults}
          </p>

          <p>
            <strong>Children:</strong> {booking.children}
          </p>

          <p>
            <strong>Rooms:</strong> {booking.roomQuantity}
          </p>

          <p>
            <strong>Total:</strong>{" "}
            {Number(booking.totalPrice).toLocaleString("en-ZA", {
              style: "currency",
              currency: "ZAR",
            })}
          </p>

          <p
            className={`booking-status booking-status-${booking.status.toLowerCase()}`}
          >
            Status:{" "}
            {booking.status === "PENDING"
              ? "Pending confirmation"
              : booking.status === "CONFIRMED"
                ? "Confirmed"
                : booking.status === "CANCELLED"
                  ? "Cancelled"
                  : booking.status === "COMPLETED"
                    ? "Completed"
                    : booking.status}
          </p>

          <h4>Payments</h4>

          {booking.payments.length === 0 ? (
            <p>No payment records.</p>
          ) : (
            booking.payments.map((payment) => (
              <p key={payment.id}>
                {payment.provider}:{" "}
                {Number(payment.amount).toLocaleString("en-ZA", {
                  style: "currency",
                  currency: payment.currency,
                })}{" "}
                — {payment.status}
              </p>
            ))
          )}

          {booking.status === "PENDING" && (
            <button
              type="button"
              className="login-link sign-out-button"
              disabled={adminActionBookingId === booking.id}
              onClick={() =>
                handleAdminBookingStatus(booking.id, "CONFIRMED")
              }
            >
              Confirm Reservation
            </button>
          )}

          {(booking.status === "PENDING" ||
            booking.status === "CONFIRMED") && (
            <>
              <button
                type="button"
                className="login-link sign-out-button"
                disabled={adminActionBookingId === booking.id}
                onClick={() => handleModifyAdminBooking(booking)}
              >
                Modify Reservation
              </button>

              <button
                type="button"
                className="login-link sign-out-button"
                disabled={adminActionBookingId === booking.id}
                onClick={() =>
                  handleAdminBookingStatus(booking.id, "CANCELLED")
                }
              >
                Cancel Reservation
              </button>
            </>
          )}
        </article>
      ))}
  </section>
)}

      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>THE GRAND AURELIA</strong>
            <small>A STAY BEYOND EXPECTATIONS</small>
          </span>
        </a>
        <p>Thoughtfully hosted in Mpumalanga, South Africa.</p>
        <span className="footer-copyright">© {new Date().getFullYear()} The Grand Aurelia</span>
      </footer>
    </div>
  );
}

export default App;

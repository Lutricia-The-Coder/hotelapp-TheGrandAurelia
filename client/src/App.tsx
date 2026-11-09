
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { Branch, RoomType, Hotel } from "./types/hotel";
import Footer from "./components/Footer";
import { getBranchPhotoUrl } from "./utils/branchPhotos";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import MyBookingsPage from "./pages/MyBookingsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminReservationsPage from "./pages/AdminReservationsPage";
import FavouritesPage from "./pages/FavouritesPage";
import DiscoverPage from "./pages/DiscoverPage";
import BranchMapPage from "./pages/BranchMapPage";
import BranchStayPage from "./pages/BranchStayPage";
import BookingPage from "./pages/BookingPage";
import {
API_BASE_URL,changeMyPassword,createBooking,getPaymentStatus,cancelPendingCheckout,
  getUserBookings, cancelBooking,loginUser,registerUser,getAdminBookings,
updateAdminBookingStatus, modifyAdminBooking,getFavoriteBranches, addFavoriteBranch,removeFavoriteBranch,getHotelReviews,getBranchReviews,submitBranchReview,type HotelReviewsResponse,type AdminBooking,type FavoriteBranch,type AuthUser,getMyProfile,
updateMyProfile,
type UserProfile,} from "./api";
import "./index.css";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store/store";
import { setUser, clearUser } from "./store/authSlice";
import AdminAccommodation from "./pages/AdminAccommodationPage";
import AdminUsers from "./AdminUsers";
import useConfirmDialog from "./components/ConfirmDialog";
import { ToastMessage } from "./components/ToastNotifications";
import { setBookings,setBookingsLoading,setBookingsError,setBookingConfirmation, updateBookingStatus, clearBookings,} from "./store/bookingSlice";
import "./redesign.css";
import { meetsPasswordPolicy, PASSWORD_POLICY_MESSAGE } from "./utils/passwordPolicy";

type AdminPage =
  | "dashboard"
  | "branches"
  | "rooms"
  | "bookings"
  | "customers"
  | "reviews"
  | "analytics"
  | "profile";
type GuestPage = "discover" | "map" | "stay" | "favorites" | "bookings" | "profile";
type PersistedNavigation = {
  guestPage: GuestPage;
  adminPage: AdminPage;
  adminPortalOpen: boolean;
  selectedHotelId?: string;
  selectedBranchId?: string;
};

function readPersistedNavigation(): Partial<PersistedNavigation> {
  try {
    const saved = sessionStorage.getItem("hotelAppNavigation");
    if (!saved) return {};
    const value: unknown = JSON.parse(saved);
    if (typeof value !== "object" || value === null) return {};
    const state = value as Partial<PersistedNavigation>;
    const guestPages: GuestPage[] = [
      "discover",
      "map",
      "stay",
      "favorites",
      "bookings",
      "profile",
    ];
    const adminPages: AdminPage[] = [
      "dashboard",
      "branches",
      "rooms",
      "bookings",
      "customers",
      "reviews",
      "analytics",
      "profile",
    ];
    return {
      guestPage: guestPages.includes(state.guestPage as GuestPage)
        ? state.guestPage
        : "discover",
      adminPage: adminPages.includes(state.adminPage as AdminPage)
        ? state.adminPage
        : "dashboard",
      adminPortalOpen: state.adminPortalOpen === true,
      selectedHotelId:
        typeof state.selectedHotelId === "string" ? state.selectedHotelId : undefined,
      selectedBranchId:
        typeof state.selectedBranchId === "string" ? state.selectedBranchId : undefined,
    };
  } catch {
    return {};
  }
}

const adminNavigation: {
  id: AdminPage;
  label: string;
  icon: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "branches", label: "Branches", icon: "hotel" },
  { id: "rooms", label: "Rooms", icon: "bed" },
  { id: "bookings", label: "Bookings", icon: "calendar" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "reviews", label: "Reviews", icon: "star" },
  { id: "analytics", label: "Analytics", icon: "chart" },
];

function PortalIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    hotel: <><path d="M4 21V5l8-3 8 3v16" /><path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" /></>,
    bed: <><path d="M2 4v16M22 20V9a2 2 0 0 0-2-2h-8v13M2 14h20" /><path d="M6 7h3a3 3 0 0 1 3 3v4H4V9a2 2 0 0 1 2-2Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    star: <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />,
    chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 4 3 5-7" /></>,
  };

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function AdminPortal({
  activePage,
  userName,
  onNavigate,
  onTogglePortal,
  onOpenProfile,
  children,
}: {
  activePage: AdminPage;
  userName: string;
  onNavigate: (page: AdminPage) => void;
  onTogglePortal: () => void;
  onOpenProfile: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTitle =
    activePage === "profile"
      ? "My Profile"
      : adminNavigation.find((item) => item.id === activePage)?.label ?? "Dashboard";

  function navigate(page: AdminPage) {
    onNavigate(page);
    setMenuOpen(false);
  }

  return (
    <div className="admin-shell">
      <aside className={`portal-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="portal-brand">
          <span className="portal-brand-mark">A</span>
          <span><b>THE GRAND AURELIA</b><small>MANAGEMENT PORTAL</small></span>
          <button
            type="button"
            className="portal-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>
        <nav aria-label="Admin navigation">
          <p className="portal-nav-label">MAIN MENU</p>
          {adminNavigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activePage === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <PortalIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="portal-logout" onClick={onTogglePortal}>
          <span aria-hidden="true">↗</span> View guest site
        </button>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="portal-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="admin-content">
        <header className="portal-topbar">
          <div className="portal-heading">
            <button
              type="button"
              className="portal-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <span /><span /><span />
            </button>
            <div>
              <p>MANAGEMENT PORTAL</p>
              <h1>{activeTitle}</h1>
            </div>
          </div>
          <button
            type="button"
            className="portal-profile"
            onClick={onOpenProfile}
            aria-label={`View profile for ${userName}`}
          >
            <span>{userName.slice(0, 1).toUpperCase()}</span>
            <b>{userName}</b>
          </button>
        </header>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}

function AdminDashboard({
  hotels,
  userName,
  branchCount,
  roomCount,
  bookings,
  loading,
  error,
  onRefresh,
  onViewBookings,
}: {
  hotels: Hotel[];
  userName: string | null;
  branchCount: number;
  roomCount: number;
  bookings: AdminBooking[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onViewBookings: () => void;
}) {
  const confirmedCount = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  ).length;
  const customerCount = new Set(bookings.map((booking) => booking.user.id)).size;
  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <>
      <section className="portal-welcome">
        <div>
          <p>{new Date().toLocaleDateString("en-ZA", { dateStyle: "full" })}</p>
          <h2>
            {userName?.trim()
              ? `Welcome back, ${userName.trim().split(/\s+/)[0]}.`
              : "Welcome back."}
          </h2>
          <span>Here’s what’s happening across your properties today.</span>
        </div>
        <button type="button" className="portal-primary-button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh reservations"}
        </button>
      </section>

      <ToastMessage message={error} />

      <section className="portal-stats" aria-label="Property statistics">
        {[
          ["Properties", hotels.length, "hotel"],
          ["Branches", branchCount, "hotel"],
          ["Room types", roomCount, "bed"],
          ["Confirmed stays", confirmedCount, "calendar"],
          ["Customers with bookings", customerCount, "users"],
        ].map(([label, value, icon]) => (
          <article className="portal-stat-card" key={label}>
            <span><PortalIcon name={String(icon)} /></span>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="portal-table-card">
        <div className="portal-card-heading">
          <div><p>LATEST ACTIVITY</p><h3>Recent Bookings</h3></div>
          <button type="button" className="portal-text-button" onClick={onViewBookings}>
            View all →
          </button>
        </div>
        {loading && <p className="portal-empty">Loading reservations...</p>}
        {!loading && recentBookings.length === 0 && (
          <p className="portal-empty">No reservation data is available yet.</p>
        )}
        {!loading && recentBookings.length > 0 && (
          <div className="portal-table-scroll">
            <table>
              <thead>
                <tr><th>Reference</th><th>Guest</th><th>Property</th><th>Stay</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><b>{booking.id.slice(0, 8).toUpperCase()}</b></td>
                    <td>{booking.user.name || booking.user.email}</td>
                    <td>{booking.roomType.branch.hotel.name}</td>
                    <td>
                      {new Date(booking.checkIn).toLocaleDateString("en-ZA")} –{" "}
                      {new Date(booking.checkOut).toLocaleDateString("en-ZA")}
                    </td>
                    <td><span className={`portal-status ${booking.status.toLowerCase()}`}>{booking.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function AdminAnalytics({
  bookings,
  loading,
  error,
  onRefresh,
}: {
  bookings: AdminBooking[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      date,
      count: bookings.filter((booking) => {
        const createdAt = new Date(booking.createdAt);
        return (
          createdAt.getFullYear() === date.getFullYear() &&
          createdAt.getMonth() === date.getMonth()
        );
      }).length,
    };
  });
  const maxCount = Math.max(1, ...months.map((month) => month.count));

  return (
    <section className="portal-chart-card">
      <div className="portal-card-heading">
        <div><p>RESERVATIONS</p><h3>Bookings by month</h3></div>
        <button type="button" className="portal-primary-button" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh data"}
        </button>
      </div>
      <ToastMessage message={error} />
      {loading ? (
        <p className="portal-empty">Loading reservation data...</p>
      ) : bookings.length === 0 ? (
        <p className="portal-empty">No reservation history is available to chart.</p>
      ) : (
        <div className="portal-bar-chart" role="img" aria-label="Reservations created in the last six months">
          {months.map(({ date, count }) => (
            <div className="portal-bar-column" key={`${date.getFullYear()}-${date.getMonth()}`}>
              <strong>{count}</strong>
              <span style={{ height: `${Math.max(5, (count / maxCount) * 100)}%` }} />
              <small>{date.toLocaleDateString("en", { month: "short" })}</small>
            </div>
          ))}
        </div>
      )}
      <p className="portal-chart-note">Monthly totals are based on reservation creation dates.</p>
    </section>
  );
}

function AppContent() {
  const { confirm, dialog: confirmationDialog } = useConfirmDialog();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [branches, setBranches] = useState<Record<string, Branch[]>>({});
  const [rooms, setRooms] = useState<Record<string, RoomType[]>>({});
  const [activeBranchPhoto, setActiveBranchPhoto] = useState<{
  branchName: string;
  photos: string[];
  index: number;
} | null>(null);
const [hotelSearch, setHotelSearch] = useState("");
const [locationSearch, setLocationSearch] = useState("");
const [minNightlyPrice, setMinNightlyPrice] = useState("");
const [maxNightlyPrice, setMaxNightlyPrice] = useState("");
const [selectedRoomAmenityIds, setSelectedRoomAmenityIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const dispatch = useDispatch<AppDispatch>();

const authUser = useSelector(
  (state: RootState) => state.auth.user,
);
const [restoredNavigation] = useState(readPersistedNavigation);
const previousAuthUserId = useRef(authUser?.id ?? null);
const restoredAccountDataLoaded = useRef(false);

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
const [profile, setProfile] = useState<UserProfile | null>(null);
const [profileName, setProfileName] = useState("");
const [profileTitle, setProfileTitle] = useState("");
const [profileLoading, setProfileLoading] = useState(false);
const [profileSaving, setProfileSaving] = useState(false);
const [profileError, setProfileError] = useState("");
const [profileMessage, setProfileMessage] = useState("");
const [passwordCurrent, setPasswordCurrent] = useState("");
const [passwordNew, setPasswordNew] = useState("");
const [passwordConfirm, setPasswordConfirm] = useState("");
const [passwordSaving, setPasswordSaving] = useState(false);
const [passwordError, setPasswordError] = useState("");
const [passwordMessage, setPasswordMessage] = useState("");

const myBookings = useSelector(
  (state: RootState) => state.bookings.bookings,
);

const myBookingsLoading = useSelector(
  (state: RootState) => state.bookings.loading,
);

const myBookingsError = useSelector(
  (state: RootState) => state.bookings.error,
);

const bookingConfirmation = useSelector(
  (state: RootState) => state.bookings.confirmation,
);


const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
const [cancellationMessage, setCancellationMessage] = useState("");

const [adminBookings, setAdminBookings] = useState<AdminBooking[]>([]);
const [adminBookingsLoading, setAdminBookingsLoading] = useState(false);
const [adminBookingsError, setAdminBookingsError] = useState("");
const [adminBookingsMessage, setAdminBookingsMessage] = useState("");
const [adminActionBookingId, setAdminActionBookingId] = useState<string | null>(null);
const [bookingToModify, setBookingToModify] = useState<AdminBooking | null>(null);
const [modifyBookingForm, setModifyBookingForm] = useState({
  checkIn: "",
  checkOut: "",
  adults: "1",
  children: "0",
  roomQuantity: "1",
});
const [modifyBookingError, setModifyBookingError] = useState("");
const [adminPortalOpen, setAdminPortalOpen] = useState(
  () => restoredNavigation.adminPortalOpen ?? authUser?.role === "ADMIN",
);
const [adminPage, setAdminPage] = useState<AdminPage>(
  () => restoredNavigation.adminPage ?? "dashboard",
);
const [favoriteBranchIds, setFavoriteBranchIds] = useState<string[]>([]);
const [favoriteBranches, setFavoriteBranches] = useState<FavoriteBranch[]>([]);
const [favoritesLoading, setFavoritesLoading] = useState(false);
const [favoritesError, setFavoritesError] = useState("");
const [favoritesMessage, setFavoritesMessage] = useState("");
const [favoriteActionBranchId, setFavoriteActionBranchId] = useState<string | null>(null);
const [guestPage, setGuestPage] = useState<GuestPage>(
  () => restoredNavigation.guestPage ?? "discover",
);
const [selectedStay, setSelectedStay] = useState<{
  hotel: Hotel;
  branch: Branch;
} | null>(null);
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

const handleLoadAdminBookings = useCallback(async () => {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAdminBookingsError("Please sign in again.");
    return;
  }

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
}, []);

useEffect(() => {
  if (authUser?.role !== "ADMIN") return;

  if (previousAuthUserId.current !== authUser.id) {
    setAdminPortalOpen(true);
    setAdminPage("dashboard");
  }
  previousAuthUserId.current = authUser.id;
  void handleLoadAdminBookings();
}, [authUser?.id, authUser?.role, handleLoadAdminBookings]);

useEffect(() => {
  if (authUser?.role !== "ADMIN") {
    previousAuthUserId.current = authUser?.id ?? null;
  }
}, [authUser?.id, authUser?.role]);

useEffect(() => {
  try {
    sessionStorage.setItem(
      "hotelAppNavigation",
      JSON.stringify({
        guestPage,
        adminPage,
        adminPortalOpen,
        selectedHotelId:
          guestPage === "stay"
            ? selectedStay?.hotel.id ?? restoredNavigation.selectedHotelId
            : undefined,
        selectedBranchId:
          guestPage === "stay"
            ? selectedStay?.branch.id ?? restoredNavigation.selectedBranchId
            : undefined,
      } satisfies PersistedNavigation),
    );
  } catch (error) {
    console.error("Unable to persist the current page.", error);
  }
}, [
  adminPage,
  adminPortalOpen,
  guestPage,
  restoredNavigation.selectedBranchId,
  restoredNavigation.selectedHotelId,
  selectedStay,
]);

useEffect(() => {
  const token = sessionStorage.getItem("hotelAuthToken");
  if (!authUser?.id || !token) return;

  let isCurrent = true;
  void getFavoriteBranches(token)
    .then((saved) => {
      if (!isCurrent) return;
      setFavoriteBranches(saved);
      setFavoriteBranchIds(saved.map((favorite) => favorite.branchId));
    })
    .catch((error: unknown) => {
      if (!isCurrent) return;
      setFavoritesError(
        error instanceof Error ? error.message : "Failed to load favorites.",
      );
    });

  return () => {
    isCurrent = false;
  };
}, [authUser?.id]);

async function handleLoadProfile() {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token || !authUser) {
    setAuthMode("login");
    setAuthError("Please sign in to view your profile.");
    return;
  }

  setProfileLoading(true);
  setProfileError("");
  setProfileMessage("");

  try {
    const result = await getMyProfile(token);

    setProfile(result);
    setProfileName(result.name ?? "");
    setProfileTitle(result.title ?? "");
  } catch (error) {
    setProfileError(
      error instanceof Error
        ? error.message
        : "Unable to load your profile.",
    );
  } finally {
    setProfileLoading(false);
  }
}

async function handleSaveProfile(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token || !authUser) {
    setProfileError("Your session has expired. Please sign in again.");
    return;
  }

  if (profileName.trim().length < 2) {
    setProfileError("Your name must contain at least 2 characters.");
    return;
  }

  setProfileSaving(true);
  setProfileError("");
  setProfileMessage("");

  try {
    const updated = await updateMyProfile(
      {
        name: profileName.trim(),
        title: profileTitle || null,
      },
      token,
    );

    setProfile(updated);
    setProfileName(updated.name ?? "");
    setProfileTitle(updated.title ?? "");

    const updatedAuthUser: AuthUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: authUser.role,
    };

    sessionStorage.setItem(
      "hotelAuthUser",
      JSON.stringify(updatedAuthUser),
    );

    dispatch(setUser(updatedAuthUser));

    setProfileMessage("Your profile has been updated successfully.");
  } catch (error) {
    setProfileError(
      error instanceof Error
        ? error.message
        : "Unable to update your profile.",
    );
  } finally {
    setProfileSaving(false);
  }
}

async function handleChangePassword(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!profile) return;

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setPasswordError("Your session has expired. Please sign in again.");
    return;
  }

  if (!meetsPasswordPolicy(passwordNew)) {
    setPasswordError(PASSWORD_POLICY_MESSAGE);
    return;
  }

  if (passwordNew !== passwordConfirm) {
    setPasswordError("Your new passwords do not match.");
    return;
  }

  setPasswordSaving(true);
  setPasswordError("");
  setPasswordMessage("");

  try {
    const result = await changeMyPassword(
      {
        ...(profile.hasPassword
          ? { currentPassword: passwordCurrent }
          : {}),
        newPassword: passwordNew,
        confirmNewPassword: passwordConfirm,
      },
      token,
    );

    setPasswordMessage(result.message);
    setPasswordCurrent("");
    setPasswordNew("");
    setPasswordConfirm("");

    setProfile((previous) =>
      previous ? { ...previous, hasPassword: true } : previous,
    );
  } catch (error) {
    setPasswordError(
      error instanceof Error
        ? error.message
        : "Unable to change your password.",
    );
  } finally {
    setPasswordSaving(false);
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

  if (!(await confirm({
    title: `${action[0].toUpperCase()}${action.slice(1)} reservation?`,
    message: `Are you sure you want to ${action} this reservation?`,
    confirmLabel: `${action[0].toUpperCase()}${action.slice(1)} reservation`,
    destructive: status === "CANCELLED",
  }))) {
    return;
  }

  setAdminActionBookingId(bookingId);
  setAdminBookingsError("");
  setAdminBookingsMessage("");

  try {
    const outcome = await updateAdminBookingStatus(
  bookingId,
  status,
  token,
);

    const bookings = await getAdminBookings(token);
    setAdminBookings(bookings);
    setAdminBookingsMessage(outcome.message);
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

function handleModifyAdminBooking(booking: AdminBooking) {
  setModifyBookingForm({
    checkIn: booking.checkIn.slice(0, 10),
    checkOut: booking.checkOut.slice(0, 10),
    adults: String(booking.adults),
    children: String(booking.children),
    roomQuantity: String(booking.roomQuantity),
  });
  setModifyBookingError("");
  setBookingToModify(booking);
}

async function submitModifyAdminBooking(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!bookingToModify) return;

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setModifyBookingError("Please sign in again.");
    return;
  }

  const { checkIn, checkOut } = modifyBookingForm;
  const adults = Number(modifyBookingForm.adults);
  const children = Number(modifyBookingForm.children);
  const roomQuantity = Number(modifyBookingForm.roomQuantity);

  if (
    !checkIn ||
    !checkOut ||
    checkOut <= checkIn ||
    !Number.isInteger(adults) ||
    adults < 1 ||
    !Number.isInteger(children) ||
    children < 0 ||
    !Number.isInteger(roomQuantity) ||
    roomQuantity < 1
  ) {
    setModifyBookingError("Enter valid dates and whole numbers for guests and room quantity.");
    return;
  }

  if (!(await confirm({
    title: "Save reservation changes?",
    message: `Update the dates, guest count, and room quantity for reservation ${bookingToModify.id}?`,
    confirmLabel: "Save changes",
  }))) return;

  setAdminActionBookingId(bookingToModify.id);
  setAdminBookingsError("");
  setAdminBookingsMessage("");
  setModifyBookingError("");

  try {
    await modifyAdminBooking(
      bookingToModify.id,
      { checkIn, checkOut, adults, children, roomQuantity },
      token,
    );

    const bookings = await getAdminBookings(token);
    setAdminBookings(bookings);
    setAdminBookingsMessage("Reservation updated successfully.");
    setBookingToModify(null);
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
    return;
  }
  setGuestPage("favorites");
  setFavoritesLoading(true);
  setFavoritesError("");
  setFavoritesMessage("");

  try {
    const saved = await getFavoriteBranches(token);
    setFavoriteBranches(saved);
    setFavoriteBranchIds(saved.map((favorite) => favorite.branchId));
  
  } catch (err) {
    setFavoritesError(
      err instanceof Error ? err.message : "Failed to load favorites.",
    );
  } finally {
    setFavoritesLoading(false);
  }
}

async function handleToggleFavorite(branch: Branch) {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAuthMode("login");
    setAuthError("Please sign in to save branches to your favorites.");
    return;
  }

  setFavoriteActionBranchId(branch.id);
  setFavoritesError("");
  setFavoritesMessage("");

  try {
    const isFavorite = favoriteBranchIds.includes(branch.id);

    if (isFavorite) {
      await removeFavoriteBranch(branch.id, token);
    } else {
      await addFavoriteBranch(branch.id, token);
    }

    const saved = await getFavoriteBranches(token);

    setFavoriteBranches(saved);
    setFavoriteBranchIds(saved.map((favorite) => favorite.branchId));
    setFavoritesMessage(
      isFavorite
        ? `${branch.name} removed from favorites.`
        : `${branch.name} added to favorites.`,
    );
  } catch (err) {
    setFavoritesError(
      err instanceof Error ? err.message : "Failed to update favorites.",
    );
  } finally {
    setFavoriteActionBranchId(null);
  }
}

async function handleLoadHotelReviews(hotelId: string) {
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

async function handleLoadBranchReviews(branchId: string) {
  setReviewsLoadingHotelId(branchId);
  setReviewErrors((previous) => ({ ...previous, [branchId]: "" }));

  try {
    const result = await getBranchReviews(branchId);

    setHotelReviews((previous) => ({
      ...previous,
      [branchId]: result,
    }));
  } catch (err) {
    setReviewErrors((previous) => ({
      ...previous,
      [branchId]: err instanceof Error
        ? err.message
        : "Failed to load branch reviews.",
    }));
  } finally {
    setReviewsLoadingHotelId(null);
  }
}

async function handleShareHotel(hotel: Hotel) {
  const url = `${window.location.origin}${window.location.pathname}#destinations`;

  const shareData = {
    title: hotel.name,
    text: `Take a look at ${hotel.name} at The Grand Aurelia.`,
    url,
  };

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      window.prompt("Copy this hotel link to share:", url);
    }

    return;
  }

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard unavailable");
    }

    await navigator.clipboard.writeText(url);
    window.alert("Hotel link copied to clipboard.");
  } catch {
    window.prompt("Copy this hotel link to share:", url);
  }
}

async function handleSubmitBranchReview(branchId: string) {
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

  setReviewSubmittingHotelId(branchId);
  setReviewErrors((previous) => ({ ...previous, [branchId]: "" }));
  setReviewMessages((previous) => ({ ...previous, [branchId]: "" }));

  try {
    await submitBranchReview(
      branchId,
      reviewRatings[branchId] ?? 5,
      reviewComments[branchId] ?? "",
      token,
    );

    const result = await getBranchReviews(branchId);

    setHotelReviews((previous) => ({
      ...previous,
      [branchId]: result,
    }));

    setReviewMessages((previous) => ({
      ...previous,
      [branchId]: "Your review has been saved.",
    }));
  } catch (err) {
    setReviewErrors((previous) => ({
      ...previous,
      [branchId]: err instanceof Error
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

  if (authMode === "register" && !meetsPasswordPolicy(authPassword)) {
    setAuthError(PASSWORD_POLICY_MESSAGE);
    return;
  }

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

setAuthMode(null);
setAuthError("");
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
  if (!authUser) {
    setAuthMode("login");
    setAuthError("Please sign in to view your bookings.");
    return;
  }

  setGuestPage("bookings");
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    setAuthMode("login");
    setAuthError("Your session has expired. Please sign in again.");
    return;
  }

  dispatch(setBookingsLoading(true));
  dispatch(setBookingsError(""));

  try {
    const bookings = await getUserBookings(authUser.id, token);
    dispatch(setBookings(bookings));
  } catch (error) {
    dispatch(
      setBookingsError(
        error instanceof Error
          ? error.message
          : "Failed to load your bookings.",
      ),
    );
  } finally {
    dispatch(setBookingsLoading(false));
  }
}

useEffect(() => {
  if (!authUser?.id || restoredAccountDataLoaded.current) return;
  restoredAccountDataLoaded.current = true;

  const token = sessionStorage.getItem("hotelAuthToken");
  if (!token) return;

  if (restoredNavigation.guestPage === "bookings") {
    dispatch(setBookingsLoading(true));
    dispatch(setBookingsError(""));
    void getUserBookings(authUser.id, token)
      .then((bookings) => dispatch(setBookings(bookings)))
      .catch((error: unknown) =>
        dispatch(
          setBookingsError(
            error instanceof Error
              ? error.message
              : "Failed to load your bookings.",
          ),
        ),
      )
      .finally(() => dispatch(setBookingsLoading(false)));
  } else if (
    restoredNavigation.guestPage === "profile" ||
    (restoredNavigation.adminPortalOpen &&
      restoredNavigation.adminPage === "profile")
  ) {
    setProfileLoading(true);
    setProfileError("");
    void getMyProfile(token)
      .then((result) => {
        setProfile(result);
        setProfileName(result.name ?? "");
        setProfileTitle(result.title ?? "");
      })
      .catch((error: unknown) =>
        setProfileError(
          error instanceof Error
            ? error.message
            : "Unable to load your profile.",
        ),
      )
      .finally(() => setProfileLoading(false));
  }
}, [
  authUser?.id,
  dispatch,
  restoredNavigation.adminPage,
  restoredNavigation.adminPortalOpen,
  restoredNavigation.guestPage,
]);


async function handleCancelBooking(bookingId: string) {
  const confirmed = await confirm({
    title: "Cancel booking?",
    message: "Are you sure you want to cancel this booking?",
    confirmLabel: "Cancel booking",
    destructive: true,
  });

  if (!confirmed) return;

  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    dispatch(
      setBookingsError("Your session has expired. Please sign in again."),
    );
    return;
  }

  setCancellingBookingId(bookingId);
  dispatch(setBookingsError(""));
setCancellationMessage("");
  try {
   const outcome = await cancelBooking(bookingId, token);

setCancellationMessage(outcome.message);

if (outcome.bookingStatus === "CANCELLED") {
  dispatch(
    updateBookingStatus({
      bookingId,
      status: "CANCELLED",
    }),
  );
}
  } catch (error) {
    dispatch(
      setBookingsError(
        error instanceof Error
          ? error.message
          : "Failed to cancel booking.",
      ),
    );
  } finally {
    setCancellingBookingId(null);
  }
}


async function handleSignOut() {
  const confirmed = await confirm({
    title: "Sign out?",
    message: "Are you sure you want to sign out of your account?",
    confirmLabel: "Sign out",
    destructive: true,
  });
  if (!confirmed) return;

  sessionStorage.removeItem("hotelAuthToken");
  sessionStorage.removeItem("hotelAuthUser");
  sessionStorage.removeItem("hotelAppNavigation");

dispatch(clearUser());
setAdminPortalOpen(false);
  setAuthMode(null);
  setAuthMessage("");
  setAuthError("");
  setAuthPassword("");
  setAuthConfirmPassword("");
  dispatch(clearBookings());
  setFavoriteBranches([]);
  setFavoriteBranchIds([]);
  setGuestPage("discover");
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

  
if (!result.success || !result.data || !result.checkoutUrl) {
  throw new Error(
    result.message || "Unable to start Payment checkout.",
  );
}

dispatch(setBookingConfirmation(null));

setBookingMessage(
  "Your booking is ready. Redirecting to secure payment...",
);

window.location.assign(result.checkoutUrl);

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
  const currentUrl = new URL(window.location.href);
  const googleError = currentUrl.searchParams.get("google_error");
  const hashParams = new URLSearchParams(
    currentUrl.hash.replace(/^#/, ""),
  );

  const token = hashParams.get("google_token");
  const userJson = hashParams.get("google_user");

  if (googleError) {
    currentUrl.searchParams.delete("google_error");
    currentUrl.hash = "";

    window.history.replaceState(
      {},
      document.title,
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );

    setAuthMode("login");
    setAuthMessage("");
    setAuthError(
      googleError === "access_denied"
        ? "Google sign-in was cancelled."
        : "Google sign-in could not be completed. Please try again.",
    );
    return;
  }

  if (!hashParams.has("google_token") && !hashParams.has("google_user")) {
    return;
  }

  // Remove the token and user details from the address bar.
  currentUrl.hash = "";

  window.history.replaceState(
    {},
    document.title,
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
  );

  try {
    if (!token || !userJson) {
      throw new Error("Incomplete Google sign-in response.");
    }

    const parsedUser: unknown = JSON.parse(userJson);

    if (typeof parsedUser !== "object" || parsedUser === null) {
      throw new Error("Invalid Google user information.");
    }

    const user = parsedUser as Partial<AuthUser>;

    if (
      typeof user.id !== "string" ||
      !(typeof user.name === "string" || user.name === null) ||
      typeof user.email !== "string" ||
      typeof user.role !== "string"
    ) {
      throw new Error("Invalid Google user information.");
    }

    sessionStorage.setItem("hotelAuthToken", token);
    sessionStorage.setItem("hotelAuthUser", JSON.stringify(user));

    dispatch(setUser(user as AuthUser));

    setAuthMode(null);
    setAuthError("");
    setAuthMessage("");
  } catch (error) {
    console.error("Google sign-in handling failed:", error);

    setAuthMode("login");
    setAuthMessage("");
    setAuthError(
      "Unable to complete Google sign-in. Please try again.",
    );
  }
}, [dispatch]);
  const loadAccommodationData = useCallback(async () => {
    setLoading(true);
    setError("");

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

      const loadedBranches = Object.values(branchMap).flat();

      const roomResults = await Promise.all(
        loadedBranches.map(async (branch) => {
          const roomResponse = await fetch(
            `${API_BASE_URL}/rooms/branch/${branch.id}`,
          );
          if (!roomResponse.ok) throw new Error("Failed to load rooms");

          const roomResult = await roomResponse.json();
          return [branch.id, roomResult.data ?? []] as const;
        }),
      );

      setRooms(Object.fromEntries(roomResults));
    } catch (loadError) {
      console.error("Failed to load accommodation:", loadError);
      setError("We couldn't load our stays. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccommodationData();
  }, [loadAccommodationData]);

  const allBranches = Object.values(branches).flat();

  useEffect(() => {
    if (
      guestPage !== "stay" ||
      selectedStay ||
      !restoredNavigation.selectedHotelId ||
      !restoredNavigation.selectedBranchId
    ) {
      return;
    }

    const hotel = hotels.find(
      (item) => item.id === restoredNavigation.selectedHotelId,
    );
    const branch = allBranches.find(
      (item) => item.id === restoredNavigation.selectedBranchId,
    );

    if (hotel && branch) {
      setSelectedStay({ hotel, branch });
    } else if (!loading) {
      setGuestPage("discover");
    }
  }, [
    allBranches,
    guestPage,
    hotels,
    loading,
    restoredNavigation.selectedBranchId,
    restoredNavigation.selectedHotelId,
    selectedStay,
  ]);
  

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const paymentResult = params.get("payment");
  const reference =
    params.get("reference") || params.get("trxref");

  if (!paymentResult) return;

  let active = true;

  function clearPaymentParams() {
    const url = new URL(window.location.href);

    url.searchParams.delete("payment");
    url.searchParams.delete("reference");
    url.searchParams.delete("trxref");
    url.searchParams.delete("session_id");
    url.searchParams.delete("booking_id");

    window.history.replaceState(
      {},
      document.title,
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  async function handlePaymentReturn() {
    const token = sessionStorage.getItem("hotelAuthToken");

    if (paymentResult === "cancelled") {
      const bookingId = params.get("booking_id");

      setBookingMessage("");
      setBookingError("");

      if (!token || !bookingId) {
        setBookingError(
          "Checkout was cancelled. Please sign in to check your reservation status.",
        );
        clearPaymentParams();
        return;
      }

      try {
        const { reference: cancelledReference } =
          await cancelPendingCheckout(bookingId, token);

        let latestPayment:
          | Awaited<ReturnType<typeof getPaymentStatus>>
          | null = null;

        for (let attempt = 0; attempt < 10; attempt++) {
          if (!active) return;

          latestPayment = await getPaymentStatus(
            cancelledReference,
            token,
          );

          if (
            latestPayment.paymentStatus !== "PENDING" ||
            latestPayment.booking.status !== "PENDING"
          ) {
            break;
          }

          if (attempt < 9) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 1200),
            );
          }
        }

        if (!active) return;

        await handleLoadMyBookings();

        if (
          latestPayment?.paymentStatus === "FAILED" &&
          latestPayment.booking.status === "CANCELLED"
        ) {
          setBookingMessage(
            "Checkout cancelled. Your unpaid reservation has been released.",
          );
        } else {
          setBookingMessage(
            "Checkout was cancelled. Your reservation is being updated. Please check My Bookings shortly.",
          );
        }
      } catch (error) {
        if (!active) return;

        setBookingError(
          error instanceof Error
            ? error.message
            : "Unable to cancel your pending checkout.",
        );
      } finally {
        if (active) {
          clearPaymentParams();
        }
      }

      return;
    }

    if (paymentResult !== "success" || !reference) {
      setBookingError("Invalid payment return information.");
      clearPaymentParams();
      return;
    }

    if (!token) {
      setBookingError(
        "Please sign in again to check your payment status.",
      );
      setAuthMode("login");
      clearPaymentParams();
      return;
    }

    setBookingLoading(true);
    setBookingError("");
    setBookingMessage("Verifying your payment with Paystack...");

    try {
      let latestPayment: Awaited<
        ReturnType<typeof getPaymentStatus>
      > | null = null;

      for (let attempt = 0; attempt < 10; attempt++) {
        if (!active) return;

        latestPayment = await getPaymentStatus(reference, token);

        if (
          latestPayment.paymentStatus !== "PENDING" ||
          latestPayment.booking.status !== "PENDING"
        ) {
          break;
        }

        if (attempt < 9) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, 1200),
          );
        }
      }

      if (!active || !latestPayment) return;

      if (
        latestPayment.paymentStatus === "SUCCEEDED" &&
        latestPayment.booking.status === "CONFIRMED"
      ) {
        dispatch(
          setBookingConfirmation(latestPayment.booking),
        );

        setBookingMessage(
          "Payment successful! Your reservation is confirmed.",
        );

        await handleLoadMyBookings();
      } else if (
        latestPayment.paymentStatus === "SUCCEEDED"
      ) {
        dispatch(setBookingConfirmation(null));
        setBookingMessage("");

        setBookingError(
          "Payment was received, but your reservation could not be confirmed. Please contact support before attempting another payment.",
        );
      } else if (
        latestPayment.paymentStatus === "FAILED" ||
        latestPayment.paymentStatus === "REFUNDED" ||
        latestPayment.booking.status === "CANCELLED"
      ) {
        dispatch(setBookingConfirmation(null));
        setBookingMessage("");

        setBookingError(
          "Your payment was not completed and your reservation is not confirmed.",
        );

        await handleLoadMyBookings();
      } else {
        dispatch(setBookingConfirmation(null));

        setBookingMessage(
          "Your payment is still processing. Your reservation is not confirmed yet. Please check My Bookings again shortly.",
        );

        await handleLoadMyBookings();
      }
    } catch (error) {
      if (!active) return;

      setBookingMessage("");

      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to verify your payment. Please try again.",
      );
    } finally {
      if (active) {
        setBookingLoading(false);
        clearPaymentParams();
      }
    }
  }

  void handlePaymentReturn();

  return () => {
    active = false;
  };
}, []);


  const allRooms = Object.values(rooms).flat();
  const availableRoomAmenities = Array.from(
  new Map(
    allRooms.flatMap((room) =>
      (room.amenities ?? []).map(({ amenity }) => [
        amenity.id,
        amenity,
      ] as const),
    ),
  ).values(),
).sort((a, b) => a.name.localeCompare(b.name));
const filteredHotels = hotels.filter((hotel) => {
  const hotelBranches = branches[hotel.id] ?? [];
  const search = hotelSearch.trim().toLowerCase();
  const location = locationSearch.trim().toLowerCase();

  const matchesSearch =
    !search ||
    [
      hotel.name,
      hotel.description ?? "",
      ...hotelBranches.flatMap((branch) => [
        branch.name,
        branch.address,
        branch.city,
        branch.country,
        ...(rooms[branch.id] ?? []).flatMap((room) => [
          room.name,
          room.description ?? "",
        ]),
      ]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);

  const matchesLocation =
    !location ||
    hotel.name.toLowerCase().includes(location) ||
    hotelBranches.some((branch) =>
      [branch.name, branch.address, branch.city, branch.country].some(
        (value) => value.toLowerCase().includes(location),
      ),
    );

const prices = hotelBranches
  .flatMap((branch) => rooms[branch.id] ?? [])
  .map((room) => Number(room.pricePerNight))
  .filter((price) => Number.isFinite(price));

  const minPrice =
    minNightlyPrice === "" ? null : Number(minNightlyPrice);

  const maxPrice =
    maxNightlyPrice === "" ? null : Number(maxNightlyPrice);

  const matchesPrice =
    minPrice === null && maxPrice === null
      ? true
      : prices.some(
          (price) =>
            (minPrice === null || price >= minPrice) &&
            (maxPrice === null || price <= maxPrice),
        );

  return matchesSearch && matchesLocation && matchesPrice;
});

  function toggleAdminPortal() {
    if (authUser?.role !== "ADMIN") return;

    const shouldOpen = !adminPortalOpen;
    setAdminPortalOpen(shouldOpen);
    if (shouldOpen) void handleLoadAdminBookings();
  }

  function navigateAdmin(page: AdminPage) {
    setAdminPage(page);
    if (page === "bookings" || page === "dashboard") {
      void handleLoadAdminBookings();
    }
  }

  function openAdminProfile() {
    setAdminPage("profile");
    setProfileError("");
    setProfileMessage("");
    void handleLoadProfile();
  }

  function navigateGuestPage(page: GuestPage) {
    if (
      ["favorites", "bookings", "profile"].includes(page) &&
      !authUser
    ) {
      setAuthMode("login");
      setAuthError("Please sign in to view your account.");
      return;
    }

    setGuestPage(page);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleViewStay(hotel: Hotel, branch: Branch) {
    setSelectedStay({ hotel, branch });
    setGuestPage("stay");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBookStayRoom(
    room: RoomType,
    checkIn: string,
    checkOut: string,
    guests: number,
  ) {
    setBookingRoom(room);
    setBookingCheckIn(checkIn);
    setBookingCheckOut(checkOut);
    setBookingAdults(guests);
    setBookingChildren(0);
    setBookingQuantity(1);
    setBookingMessage("");
    setBookingError("");
  }

  const profilePage = (
    <ProfilePage
      profile={profile}
      profileLoading={profileLoading}
      profileError={profileError}
      profileMessage={profileMessage}
      profileSaving={profileSaving}
      profileName={profileName}
      setProfileName={setProfileName}
      profileTitle={profileTitle}
      setProfileTitle={setProfileTitle}
      setProfileError={setProfileError}
      setProfileMessage={setProfileMessage}
      handleSaveProfile={handleSaveProfile}
      passwordError={passwordError}
      passwordMessage={passwordMessage}
      passwordCurrent={passwordCurrent}
      setPasswordCurrent={setPasswordCurrent}
      passwordNew={passwordNew}
      setPasswordNew={setPasswordNew}
      passwordConfirm={passwordConfirm}
      setPasswordConfirm={setPasswordConfirm}
      passwordSaving={passwordSaving}
      handleChangePassword={handleChangePassword}
      handleLoadMyBookings={handleLoadMyBookings}
      handleLoadFavorites={handleLoadFavorites}
      onSignOut={handleSignOut}
      showShortcuts={!adminPortalOpen}
    />
  );

  return (
    <div className="site-shell">
      {adminPortalOpen && authUser?.role === "ADMIN" ? (
        <AdminPortal
          activePage={adminPage}
          userName={authUser.name || authUser.email}
          onNavigate={navigateAdmin}
          onTogglePortal={toggleAdminPortal}
          onOpenProfile={openAdminProfile}
        >
          {adminPage === "profile" && profilePage}
          {adminPage === "dashboard" && (
            <AdminDashboard
              hotels={hotels}
              userName={authUser.name}
              branchCount={allBranches.length}
              roomCount={allRooms.length}
              bookings={adminBookings}
              loading={adminBookingsLoading}
              error={adminBookingsError}
              onRefresh={handleLoadAdminBookings}
              onViewBookings={() => navigateAdmin("bookings")}
            />
          )}
          {(adminPage === "branches" || adminPage === "rooms") && (
            <AdminAccommodation
              section={adminPage}
              onBranchesChanged={loadAccommodationData}
            />
          )}
          {adminPage === "bookings" && (
            <AdminReservationsPage
              adminBookings={adminBookings}
              adminBookingsLoading={adminBookingsLoading}
              adminBookingsError={adminBookingsError}
              adminBookingsMessage={adminBookingsMessage}
              adminActionBookingId={adminActionBookingId}
              handleAdminBookingStatus={handleAdminBookingStatus}
              handleModifyAdminBooking={handleModifyAdminBooking}
            />
          )}
          {adminPage === "customers" && <AdminUsers currentUserId={authUser.id} />}
          {adminPage === "reviews" && (
            <section className="portal-table-card portal-reviews">
              <div className="portal-card-heading">
                <div><p>GUEST VOICE</p><h3>Hotel reviews</h3></div>
              </div>
              {hotels.map((hotel) => {
                const reviews = hotelReviews[hotel.id];
                return (
                  <article className="portal-review-hotel" key={hotel.id}>
                    <div className="portal-review-hotel-heading">
                      <div>
                        <h4>{hotel.name}</h4>
                        <p>
                          {reviews
                            ? `${reviews.count} review${reviews.count === 1 ? "" : "s"}${reviews.averageRating === null ? "" : ` · ${reviews.averageRating.toFixed(1)} / 5`}`
                            : "Reviews have not been loaded."}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="portal-secondary-button"
                        disabled={reviewsLoadingHotelId === hotel.id}
                        onClick={() => void handleLoadHotelReviews(hotel.id)}
                      >
                        {reviewsLoadingHotelId === hotel.id
                          ? "Loading..."
                          : reviews
                            ? "Refresh reviews"
                            : "Load reviews"}
                      </button>
                    </div>
                    <ToastMessage message={reviewErrors[hotel.id]} />
                    {reviews?.data.slice(0, 3).map((review) => (
                      <div className="portal-review-entry" key={review.id}>
                        <div>
                          <b>{review.user.name || "Guest"}</b>
                          <span>{review.rating} / 5</span>
                        </div>
                        {review.comment && <p>{review.comment}</p>}
                        <small>{new Date(review.createdAt).toLocaleDateString("en-ZA")}</small>
                      </div>
                    ))}
                    {reviews?.count === 0 && (
                      <p className="portal-empty">No reviews have been submitted for this hotel.</p>
                    )}
                  </article>
                );
              })}
            </section>
          )}
          {adminPage === "analytics" && (
            <AdminAnalytics
              bookings={adminBookings}
              loading={adminBookingsLoading}
              error={adminBookingsError}
              onRefresh={handleLoadAdminBookings}
            />
          )}
        </AdminPortal>
      ) : (
        <>
          <Header
            authUser={authUser}
            profileLoading={profileLoading}
            guestPage={guestPage}
            onNavigatePage={navigateGuestPage}
            handleLoadProfile={handleLoadProfile}
            myBookingsLoading={myBookingsLoading}
            handleLoadMyBookings={handleLoadMyBookings}
            favoritesLoading={favoritesLoading}
            handleLoadFavorites={handleLoadFavorites}
            setAuthMode={setAuthMode}
            adminPortalOpen={adminPortalOpen}
            onToggleAdminPortal={toggleAdminPortal}
          />
          <main>
            <AuthModal
  authMode={authMode}
  setAuthMode={setAuthMode}
  authName={authName}
  setAuthName={setAuthName}
  authEmail={authEmail}
  setAuthEmail={setAuthEmail}
  authTitle={authTitle}
  setAuthTitle={setAuthTitle}
  authPassword={authPassword}
  setAuthPassword={setAuthPassword}
  authConfirmPassword={authConfirmPassword}
  setAuthConfirmPassword={setAuthConfirmPassword}
  authMessage={authMessage}
  setAuthMessage={setAuthMessage}
  authError={authError}
  setAuthError={setAuthError}
  authLoading={authLoading}
  handleAuthSubmit={handleAuthSubmit}
  apiBaseUrl={API_BASE_URL}
/>
{guestPage === "map" ? (
 <BranchMapPage
   branches={allBranches}
   loading={loading}
   error={error}
   onBack={() => navigateGuestPage("discover")}
 />
) : guestPage === "stay" && selectedStay ? (
 <BranchStayPage
   hotel={selectedStay.hotel}
   branch={selectedStay.branch}
   rooms={rooms[selectedStay.branch.id] ?? []}
   favorite={favoriteBranchIds.includes(selectedStay.branch.id)}
   rating={hotelReviews[selectedStay.branch.id]?.averageRating ?? null}
   onBack={() => navigateGuestPage("discover")}
   onToggleFavorite={() => void handleToggleFavorite(selectedStay.branch)}
   onBookRoom={handleBookStayRoom}
 />
) : guestPage === "discover" || !authUser ? (
<DiscoverPage
  hotels={hotels}
  branches={branches}
  rooms={rooms}
  allBranches={allBranches}
  filteredHotels={filteredHotels}
  availableRoomAmenities={availableRoomAmenities}
  loading={loading}
  error={error}
  hotelSearch={hotelSearch}
  setHotelSearch={setHotelSearch}
  locationSearch={locationSearch}
  setLocationSearch={setLocationSearch}
  minNightlyPrice={minNightlyPrice}
  setMinNightlyPrice={setMinNightlyPrice}
  maxNightlyPrice={maxNightlyPrice}
  setMaxNightlyPrice={setMaxNightlyPrice}
  setActiveBranchPhoto={setActiveBranchPhoto}
  onViewStay={handleViewStay}
  favoriteBranchIds={favoriteBranchIds}
  favoritesError={favoritesError}
  favoritesMessage={favoritesMessage}
  favoriteActionBranchId={favoriteActionBranchId}
  handleToggleFavorite={handleToggleFavorite}
  handleShareHotel={handleShareHotel}
  hotelReviews={hotelReviews}
  reviewsOpen={reviewsOpen}
  setReviewsOpen={setReviewsOpen}
  reviewsLoadingHotelId={reviewsLoadingHotelId}
  reviewErrors={reviewErrors}
  reviewMessages={reviewMessages}
  reviewRatings={reviewRatings}
  setReviewRatings={setReviewRatings}
  reviewComments={reviewComments}
  setReviewComments={setReviewComments}
  reviewSubmittingHotelId={reviewSubmittingHotelId}
  handleLoadBranchReviews={handleLoadBranchReviews}
  handleSubmitBranchReview={handleSubmitBranchReview}
  selectedRoomAmenityIds={selectedRoomAmenityIds}
  setSelectedRoomAmenityIds={setSelectedRoomAmenityIds}
  setBookingRoom={setBookingRoom}
  setBookingCheckIn={setBookingCheckIn}
  setBookingCheckOut={setBookingCheckOut}
  setBookingAdults={setBookingAdults}
  setBookingChildren={setBookingChildren}
  setBookingQuantity={setBookingQuantity}
  setBookingMessage={setBookingMessage}
  setBookingError={setBookingError}
>

</DiscoverPage>
) : guestPage === "favorites" ? (
 <FavouritesPage
  favoriteBranches={favoriteBranches}
  favoritesError={favoritesError}
  favoritesMessage={favoritesMessage}
  favoritesLoading={favoritesLoading}
  favoriteActionBranchId={favoriteActionBranchId}
  allBranches={allBranches}
  hotels={hotels}
  rooms={rooms}
  hotelReviews={hotelReviews}
  handleToggleFavorite={handleToggleFavorite}
  onViewStay={handleViewStay}
/>
 ) : guestPage === "profile" ? (
  profilePage
 ) : (
  <MyBookingsPage
    myBookings={myBookings}
    myBookingsLoading={myBookingsLoading}
    myBookingsError={myBookingsError}
    cancellationMessage={cancellationMessage}
    cancellingBookingId={cancellingBookingId}
    handleCancelBooking={handleCancelBooking}
  />
)}
{bookingRoom && (
  <BookingPage
    bookingRoom={bookingRoom}
    bookingCheckIn={bookingCheckIn}
    setBookingCheckIn={setBookingCheckIn}
    bookingCheckOut={bookingCheckOut}
    setBookingCheckOut={setBookingCheckOut}
    bookingAdults={bookingAdults}
    setBookingAdults={setBookingAdults}
    bookingChildren={bookingChildren}
    setBookingChildren={setBookingChildren}
    bookingQuantity={bookingQuantity}
    setBookingQuantity={setBookingQuantity}
    bookingError={bookingError}
    bookingMessage={bookingMessage}
    bookingConfirmation={bookingConfirmation}
    bookingLoading={bookingLoading}
    isAuthenticated={Boolean(authUser)}
    handleBookingSubmit={handleBookingSubmit}
    handleClose={() => {
      setBookingRoom(null);
      setBookingMessage("");
      setBookingError("");
    }}
  />
)}

          </main>
          <Footer />
        </>
      )}
            {activeBranchPhoto && (
        <div
          className="branch-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeBranchPhoto.branchName} photo viewer`}
          onClick={() => setActiveBranchPhoto(null)}
        >
          <div
            className="branch-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="branch-lightbox-close"
              aria-label="Close photo viewer"
              onClick={() => setActiveBranchPhoto(null)}
            >
              &times;
            </button>

            <img
              className="branch-lightbox-image"
              src={getBranchPhotoUrl(
                activeBranchPhoto.photos[activeBranchPhoto.index],
              )}
              alt={`${activeBranchPhoto.branchName} accommodation`}
            />

            {activeBranchPhoto.photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="branch-lightbox-prev"
                  aria-label="Previous photo"
                  onClick={() =>
                    setActiveBranchPhoto((current) =>
                      current
                        ? {
                            ...current,
                            index:
                              (current.index - 1 + current.photos.length) %
                              current.photos.length,
                          }
                        : null,
                    )
                  }
                >
                  &#10094;
                </button>

                <button
                  type="button"
                  className="branch-lightbox-next"
                  aria-label="Next photo"
                  onClick={() =>
                    setActiveBranchPhoto((current) =>
                      current
                        ? {
                            ...current,
                            index: (current.index + 1) % current.photos.length,
                          }
                        : null,
                    )
                  }
                >
                  &#10095;
                </button>
              </>
            )}

            <div className="branch-lightbox-caption">
              {activeBranchPhoto.branchName} Â·{" "}
              {activeBranchPhoto.index + 1} of{" "}
              {activeBranchPhoto.photos.length}
            </div>
          </div>
        </div>
      )}
      {bookingToModify && (
        <div
          className="confirm-dialog-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              adminActionBookingId !== bookingToModify.id
            ) {
              setBookingToModify(null);
            }
          }}
        >
          <section
            className="confirm-dialog modify-reservation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modify-reservation-title"
          >
            <h2 id="modify-reservation-title">Modify reservation</h2>
            <p>
              Update dates and guest/room counts for {bookingToModify.user.name || bookingToModify.user.email}.
            </p>
            <form onSubmit={submitModifyAdminBooking}>
              <div className="modify-reservation-fields">
                <label>
                  Check-in
                  <input
                    type="date"
                    value={modifyBookingForm.checkIn}
                    onChange={(event) =>
                      setModifyBookingForm((current) => ({
                        ...current,
                        checkIn: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Check-out
                  <input
                    type="date"
                    min={modifyBookingForm.checkIn || undefined}
                    value={modifyBookingForm.checkOut}
                    onChange={(event) =>
                      setModifyBookingForm((current) => ({
                        ...current,
                        checkOut: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Adults
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={modifyBookingForm.adults}
                    onChange={(event) =>
                      setModifyBookingForm((current) => ({
                        ...current,
                        adults: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Children
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={modifyBookingForm.children}
                    onChange={(event) =>
                      setModifyBookingForm((current) => ({
                        ...current,
                        children: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Rooms
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={modifyBookingForm.roomQuantity}
                    onChange={(event) =>
                      setModifyBookingForm((current) => ({
                        ...current,
                        roomQuantity: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <ToastMessage message={modifyBookingError} />
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="confirm-dialog-cancel"
                  onClick={() => setBookingToModify(null)}
                  disabled={adminActionBookingId === bookingToModify.id}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="confirm-dialog-accept"
                  disabled={adminActionBookingId === bookingToModify.id}
                >
                  {adminActionBookingId === bookingToModify.id
                    ? "Saving..."
                    : "Review and save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {confirmationDialog}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

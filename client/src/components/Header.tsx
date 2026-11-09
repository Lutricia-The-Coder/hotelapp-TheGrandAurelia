import type { AuthUser } from "../api";

type GuestPage = "discover" | "map" | "stay" | "favorites" | "bookings" | "profile";

type HeaderProps = {
  authUser: AuthUser | null;
  profileLoading: boolean;
  guestPage: GuestPage;
  onNavigatePage: (page: GuestPage) => void;
  handleLoadProfile: () => Promise<void>;
  myBookingsLoading: boolean;
  handleLoadMyBookings: () => Promise<void>;
  favoritesLoading: boolean;
  handleLoadFavorites: () => Promise<void>;
  setAuthMode: (mode: "login" | "register" | null) => void;
  adminPortalOpen: boolean;
  onToggleAdminPortal: () => void;
};

export default function Header({
  authUser,
  profileLoading,
  guestPage,
  onNavigatePage,
  handleLoadProfile,
  myBookingsLoading,
  handleLoadMyBookings,
  favoritesLoading,
  handleLoadFavorites,
  setAuthMode,
  adminPortalOpen,
  onToggleAdminPortal,
}: HeaderProps) {
  async function openProfile() {
    if (guestPage === "profile") {
      onNavigatePage("discover");
      return;
    }

    onNavigatePage("profile");
    await handleLoadProfile();
  }

  async function openBookings() {
    if (guestPage === "bookings") {
      onNavigatePage("discover");
      return;
    }

    onNavigatePage("bookings");
    await handleLoadMyBookings();
  }

  async function toggleFavorites() {
    if (guestPage === "favorites") {
      onNavigatePage("discover");
      return;
    }

    onNavigatePage("favorites");
    await handleLoadFavorites();
  }

  function openDiscovery(anchor?: string) {
    onNavigatePage("discover");
    if (anchor) {
      window.requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  return (
    <header className="site-header">
      <a
        className="brand"
        href="#home"
        aria-label="The Grand Aurelia home"
        onClick={() => openDiscovery("home")}
      >
        <span className="brand-mark">A</span>
        <span className="brand-copy">
          <strong>THE GRAND AURELIA</strong>
          <small>A STAY BEYOND EXPECTATIONS</small>
        </span>
      </a>

      <nav className="main-nav" aria-label="Main navigation">
        <button
          type="button"
          className={guestPage === "discover" ? "nav-active" : ""}
          onClick={() => openDiscovery("home")}
        >
          Discover
        </button>
        <a href="#destinations" onClick={() => openDiscovery("destinations")}>Branches</a>
        <button
          type="button"
          className={guestPage === "map" ? "nav-active" : ""}
          onClick={() => onNavigatePage("map")}
        >
          Map
        </button>
        <button type="button" onClick={() => void toggleFavorites()} disabled={favoritesLoading}>
          {favoritesLoading ? "Loading..." : "Favourites"}
        </button>
        <button type="button" onClick={() => void openBookings()} disabled={myBookingsLoading}>
          {myBookingsLoading ? "Loading..." : "My stays"}
        </button>
      </nav>

      <div className="header-actions">
        {authUser ? (
          <>
            <button
              type="button"
              className="user-pill"
              onClick={() => void openProfile()}
              disabled={profileLoading}
            >
              <span>{(authUser.name || authUser.email).slice(0, 1).toUpperCase()}</span>
              <b>{profileLoading ? "Loading..." : authUser.name || authUser.email}</b>
            </button>
            {authUser.role === "ADMIN" && (
              <button
                type="button"
                className="admin-portal-link"
                onClick={onToggleAdminPortal}
              >
                {adminPortalOpen ? "Guest site" : "Admin portal"}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="header-cta"
            onClick={() => setAuthMode("register")}
          >
            Get Started
          </button>
        )}

      </div>
    </header>
  );
}

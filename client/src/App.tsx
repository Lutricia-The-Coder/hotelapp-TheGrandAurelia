
import { useEffect, useState } from "react";
import { API_BASE_URL, loginUser, registerUser } from "./api";
import "./index.css";

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
  const [authName, setAuthName] = useState("");
const [authEmail, setAuthEmail] = useState("");
const [authTitle, setAuthTitle] = useState("");
const [authConfirmPassword, setAuthConfirmPassword] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authMessage, setAuthMessage] = useState("");
const [authError, setAuthError] = useState("");
const [authLoading, setAuthLoading] = useState(false);

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
        authTitle,
        authName.trim(),
        authEmail.trim(),
        authPassword,
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
                  <p className="destination-description">
                    {hotel.description || "A thoughtful stay, designed around you."}
                  </p>

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
                      <a className="room-book-button" href="#booking" onClick={(event) => {
                        event.preventDefault();
                        alert("Booking form coming next. Your room details are ready!");
                      }}>
                        Book now <span>→</span>
                      </a>
                    </div>
                  </div>
                </article>
              )),
            )}
          </div>
        </section>

        <section className="closing-banner" id="booking">
          <div>
            <p className="eyebrow hero-eyebrow"><span /> YOUR NEXT CHAPTER STARTS HERE</p>
            <h2>Make room for<br /><em>something wonderful.</em></h2>
          </div>
          <a className="gold-button" href="#rooms">Find your stay <span>→</span></a>
        </section>
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

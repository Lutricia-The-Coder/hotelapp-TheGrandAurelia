
import { useEffect, useState } from "react";
import { API_BASE_URL } from "./api";
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

        <a className="header-cta" href="#rooms">Explore Stays <span>↗</span></a>
      </header>

      <main>
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

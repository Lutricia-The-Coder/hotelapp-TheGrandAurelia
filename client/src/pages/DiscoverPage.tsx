import { useState, type Dispatch, type SetStateAction } from "react";
import type { Branch, Hotel, RoomType } from "../types/hotel";
import type { HotelReviewsResponse } from "../api";
import { getBranchPhotos, getBranchPhotoUrl } from "../utils/branchPhotos";
import { normalizeSearchText } from "../utils/search";
import { ToastMessage } from "../components/ToastNotifications";

type BranchPhoto = {
  branchName: string;
  photos: string[];
  index: number;
};

type Amenity = {
  id: string;
  name: string;
};

type DiscoverPageProps = {
  hotels: Hotel[];
  branches: Record<string, Branch[]>;
  rooms: Record<string, RoomType[]>;
  allBranches: Branch[];
  filteredHotels: Hotel[];
  availableRoomAmenities: Amenity[];
  loading: boolean;
  error: string;
  hotelSearch: string;
  setHotelSearch: Dispatch<SetStateAction<string>>;
  locationSearch: string;
  setLocationSearch: Dispatch<SetStateAction<string>>;
  minNightlyPrice: string;
  setMinNightlyPrice: Dispatch<SetStateAction<string>>;
  maxNightlyPrice: string;
  setMaxNightlyPrice: Dispatch<SetStateAction<string>>;
  setActiveBranchPhoto: Dispatch<SetStateAction<BranchPhoto | null>>;
  onViewStay: (hotel: Hotel, branch: Branch) => void;
  favoriteBranchIds: string[];
  favoritesError: string;
  favoritesMessage: string;
  favoriteActionBranchId: string | null;
  handleToggleFavorite: (branch: Branch) => Promise<void>;
  handleShareHotel: (hotel: Hotel) => Promise<void>;
  hotelReviews: Record<string, HotelReviewsResponse>;
  reviewsOpen: Record<string, boolean>;
  setReviewsOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  reviewsLoadingHotelId: string | null;
  reviewErrors: Record<string, string>;
  reviewMessages: Record<string, string>;
  reviewRatings: Record<string, number>;
  setReviewRatings: Dispatch<SetStateAction<Record<string, number>>>;
  reviewComments: Record<string, string>;
  setReviewComments: Dispatch<SetStateAction<Record<string, string>>>;
  reviewSubmittingHotelId: string | null;
  handleLoadBranchReviews: (branchId: string) => Promise<void>;
  handleSubmitBranchReview: (branchId: string) => Promise<void>;
  selectedRoomAmenityIds: string[];
  setSelectedRoomAmenityIds: Dispatch<SetStateAction<string[]>>;
  setBookingRoom: Dispatch<SetStateAction<RoomType | null>>;
  setBookingCheckIn: Dispatch<SetStateAction<string>>;
  setBookingCheckOut: Dispatch<SetStateAction<string>>;
  setBookingAdults: Dispatch<SetStateAction<number>>;
  setBookingChildren: Dispatch<SetStateAction<number>>;
  setBookingQuantity: Dispatch<SetStateAction<number>>;
  setBookingMessage: Dispatch<SetStateAction<string>>;
  setBookingError: Dispatch<SetStateAction<string>>;
};

export default function DiscoverPage({
  hotels,
  branches,
  rooms,
  allBranches,
  filteredHotels,
  availableRoomAmenities,
  loading,
  error,
  hotelSearch,
  setHotelSearch,
  locationSearch,
  setLocationSearch,
  minNightlyPrice,
  setMinNightlyPrice,
  maxNightlyPrice,
  setMaxNightlyPrice,
  setActiveBranchPhoto,
  onViewStay,
  favoriteBranchIds,
  favoritesError,
  favoritesMessage,
  favoriteActionBranchId,
  handleToggleFavorite,
  handleShareHotel,
  hotelReviews,
  reviewsOpen,
  setReviewsOpen,
  reviewsLoadingHotelId,
  reviewErrors,
  reviewMessages,
  reviewRatings,
  setReviewRatings,
  reviewComments,
  setReviewComments,
  reviewSubmittingHotelId,
  handleLoadBranchReviews,
  handleSubmitBranchReview,
  selectedRoomAmenityIds,
  setSelectedRoomAmenityIds,
  setBookingRoom,
  setBookingCheckIn,
  setBookingCheckOut,
  setBookingAdults,
  setBookingChildren,
  setBookingQuantity,
  setBookingMessage,
  setBookingError,
}: DiscoverPageProps) {
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const fallbackBranchPhotos = [
    "https://images.unsplash.com/photo-1735770517146-e95c872226fc?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1600760380065-2fcdc9e73007?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1588504633950-9dc518941e93?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1579991515244-f8ec47f8263d?auto=format&fit=crop&w=1200&q=85",
  ];
  const featuredBranches = filteredHotels.flatMap((hotel) =>
    (branches[hotel.id] ?? [])
      .filter((branch) => {
        const search = normalizeSearchText(
          `${hotel.name} ${hotel.description ?? ""} ${branch.name} ${branch.address} ${branch.city} ${branch.country}`,
        );
        const term = normalizeSearchText(hotelSearch);
        const location = normalizeSearchText(locationSearch);
        const branchRooms = rooms[branch.id] ?? [];
        const min = minNightlyPrice === "" ? null : Number(minNightlyPrice);
        const max = maxNightlyPrice === "" ? null : Number(maxNightlyPrice);
        const matchesPrice =
          min === null && max === null
            ? true
            : branchRooms.some(
                (room) =>
                  (min === null || room.pricePerNight >= min) &&
                  (max === null || room.pricePerNight <= max),
              );

        return (
          (!term || search.includes(term)) &&
          (!location ||
            normalizeSearchText(
              `${hotel.name} ${branch.name} ${branch.address} ${branch.city} ${branch.country}`,
            ).includes(location)) &&
          matchesPrice
        );
      })
      .map((branch) => ({ hotel, branch })),
  );
  const today = new Date().toLocaleDateString("en-CA");

  return (
<><section className="hero" id="home">
  <div
    className="hero-image"
    role="img"
    aria-label="Luxury resort surrounded by tropical greenery"
    style={{
      backgroundImage:
        "url('https://images.unsplash.com/photo-1713843841925-6af6ed0df472?auto=format&fit=crop&w=1800&q=88')",
    }}
  />
  <div className="hero-shade" />

  <div className="hero-content">
    <p className="eyebrow hero-eyebrow">
      THE WORLD, BEAUTIFULLY YOURS
    </p>

    <h1>
      Extraordinary stays.<br />
      <em>Timeless memories.</em>
    </h1>

    <p className="hero-description">
      Discover considered luxury in the world’s most remarkable destinations.
    </p>

    <a className="gold-button" href="#destinations">
      Explore our branches <span>→</span>
    </a>
  </div>

  <div className="hero-caption">
    <span className="caption-line" />
    <span>THE GRAND AURELIA · SOUTH AFRICA</span>
  </div>

  <div className="hero-index">
    <strong>01</strong> / THE ART OF STAYING
  </div>
</section>

<form
  className="search-section"
  aria-label="Search branch availability"
  onSubmit={(event) => {
    event.preventDefault();
    document.getElementById("destinations")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }}
>
  <div className="search-intro">
    <span className="search-icon" aria-hidden="true">⌕</span>
    <div>
      <strong>Find your stay</strong>
      <span>Your next escape begins here</span>
    </div>
  </div>

  <label className="search-destination">
    <span className="field-label">DESTINATION</span>
    <input
      type="search"
      value={locationSearch || hotelSearch}
      onChange={(event) => {
        setLocationSearch(event.target.value);
        setHotelSearch(event.target.value);
      }}
      placeholder="City, branch, or hotel"
      aria-label="Search destination, branch, or hotel"
    />
  </label>

  <label className="search-field search-date-field">
    <span className="field-label">CHECK IN</span>
    <input
      type="date"
      value={checkInDate}
      min={today}
      onChange={(event) => {
        const nextCheckInDate = event.target.value;
        setCheckInDate(nextCheckInDate);
        if (checkOutDate && checkOutDate <= nextCheckInDate) {
          setCheckOutDate("");
        }
      }}
      aria-label="Check-in date"
    />
  </label>

  <label className="search-field search-date-field">
    <span className="field-label">CHECK OUT</span>
    <input
      type="date"
      value={checkOutDate}
      min={
        checkInDate
          ? new Date(new Date(checkInDate).getTime() + 86400000)
              .toISOString()
              .slice(0, 10)
          : today
      }
      onChange={(event) => setCheckOutDate(event.target.value)}
      aria-label="Check-out date"
    />
  </label>

  <label className="search-field search-guests-field">
    <span className="field-label">GUESTS</span>
    <select
      value={guestCount}
      onChange={(event) => setGuestCount(Number(event.target.value))}
      aria-label="Number of guests"
    >
      {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
        <option key={count} value={count}>
          {count} {count === 1 ? "Guest" : "Guests"}
        </option>
      ))}
    </select>
  </label>

  <button className="search-button" type="submit">
    Search <span aria-hidden="true">→</span>
  </button>
</form>
        <section className="destinations-section" id="destinations">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span /> CURATED FOR YOU</p>
              <h2>Featured <em>branches.</em></h2>
              <p className="section-note">
                Exceptional places, chosen with intention.
              </p>
            </div>
            <a className="text-link branch-explore-all" href="#rooms">
              Explore all <span aria-hidden="true">→</span>
            </a>
          </div>

          {loading && <p className="status-message">Discovering our stays...</p>}
          <ToastMessage message={error} />

          {!loading && !error && hotels.length === 0 && (
            <p className="status-message">Our stays are coming soon.</p>
          )}
<ToastMessage message={favoritesError ? `Favourites error: ${favoritesError}` : ""} />

{favoritesMessage && (
  <p className="status-message" role="status">
    {favoritesMessage}
  </p>
)}

<details className="hotel-search-filters">
  <summary aria-label="Show price filters" title="Price filters">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  </summary>
  <div className="price-filter-fields">
    <label>
      Minimum price per night (R)
      <input
        type="number"
        min="0"
        value={minNightlyPrice}
        onChange={(event) => setMinNightlyPrice(event.target.value)}
        placeholder="No minimum"
      />
    </label>

    <label>
      Maximum price per night (R)
      <input
        type="number"
        min="0"
        value={maxNightlyPrice}
        onChange={(event) => setMaxNightlyPrice(event.target.value)}
        placeholder="No maximum"
      />
    </label>

    <button
      type="button"
      className="login-link sign-out-button"
      onClick={() => {
        setHotelSearch("");
        setLocationSearch("");
        setMinNightlyPrice("");
        setMaxNightlyPrice("");
      }}
    >
      Clear filters
    </button>
  </div>
</details>

{!loading && !error && allBranches.length > 0 && featuredBranches.length === 0 && (
  <p className="status-message">
    No branches match your search. Try changing your destination or price filters.
  </p>
)}

          <div className="destination-grid branch-card-grid">
            {featuredBranches.map(({ hotel, branch }, branchIndex) => {
              const branchPhotos = getBranchPhotos(branch);
              const branchPhotoIndex = 0;
              const branchPhoto = branchPhotos[branchPhotoIndex];
              const branchRooms = rooms[branch.id] ?? [];
              const branchSummary =
                branch.amenities?.slice(0, 2).map(({ amenity }) => amenity.name).join(" · ") ||
                hotel.description?.trim();
              const branchLowestPrice = branchRooms.length
                ? Math.min(...branchRooms.map((room) => room.pricePerNight))
                : null;
              const branchRating = hotelReviews[branch.id]?.averageRating;

              return (
              <article className="destination-card branch-feature-card" key={branch.id} id={`branch-${branch.id}`}>
              
<div className="destination-photo">
  {branchPhoto ? (
    <img
      className="destination-photo-image"
      src={getBranchPhotoUrl(branchPhoto)}
      alt={`${branch.name} at ${hotel.name}`}
      loading="lazy"
      role="button"
      tabIndex={0}
      aria-label={`Enlarge photo of ${branch.name}`}
      onClick={() =>
        setActiveBranchPhoto({
          branchName: branch.name,
          photos: branchPhotos,
          index: branchPhotoIndex,
        })
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActiveBranchPhoto({
            branchName: branch.name,
            photos: branchPhotos,
            index: branchPhotoIndex,
          });
        }
      }}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  ) : hotel.images?.[0] ? (
    <img
      className="destination-photo-image"
      src={hotel.images[0].url}
      alt={hotel.images[0].altText || `${branch.name} at ${hotel.name}`}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <img
      className="destination-photo-image"
      src={fallbackBranchPhotos[branchIndex % fallbackBranchPhotos.length]}
      alt={`${branch.name} accommodation`}
      loading="lazy"
    />
  )}

  <div className="photo-overlay" />

  <div className="branch-card-photo-actions">
    <button
      type="button"
      className="card-share-button"
      aria-label={`Share ${hotel.name}`}
      onClick={() => void handleShareHotel(hotel)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
      </svg>
    </button>
    <button
      type="button"
      className={`favorite-heart${favoriteBranchIds.includes(branch.id) ? " is-favorite" : ""}`}
      aria-label={
        favoriteBranchIds.includes(branch.id)
          ? `Remove ${branch.name} from favourites`
          : `Save ${branch.name}`
      }
      aria-pressed={favoriteBranchIds.includes(branch.id)}
      title={favoriteBranchIds.includes(branch.id) ? "Remove from favourites" : "Save branch"}
      onClick={() => void handleToggleFavorite(branch)}
      disabled={favoriteActionBranchId === branch.id}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
    </button>
  </div>

  <span className="photo-tag">THE GRAND AURELIA</span>
                </div>
                <div className="destination-content">
                  <div className="branch-card-meta">
                    <a
                      className="branch-card-location"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${branch.address}, ${branch.city}, ${branch.country}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${branch.name} location on map`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      <span>{branch.city}, {branch.country}</span>
                    </a>
                    <button
                      type="button"
                      className="branch-card-rating"
                      aria-label={
                        reviewsOpen[branch.id]
                          ? `Hide reviews for ${branch.name}`
                          : `View reviews for ${branch.name}`
                      }
                      onClick={() => {
                        if (reviewsOpen[branch.id]) {
                          setReviewsOpen((previous) => ({
                            ...previous,
                            [branch.id]: false,
                          }));
                        } else {
                          setReviewsOpen((previous) => ({
                            ...previous,
                            [branch.id]: true,
                          }));
                          void handleLoadBranchReviews(branch.id);
                        }
                      }}
                      disabled={reviewsLoadingHotelId === branch.id}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                      </svg>
                      {branchRating !== null && branchRating !== undefined && (
                        <span>{branchRating.toFixed(1)}</span>
                      )}
                    </button>
                  </div>
                  <h3>{branch.name}</h3>
                  {branchSummary && (
                    <p className="destination-description">{branchSummary}</p>
                  )}

<div className="hotel-reviews">
  {reviewsOpen[branch.id] && (
    <div className="hotel-reviews-panel">
      {reviewErrors[branch.id] && (
        <ToastMessage message={reviewErrors[branch.id]} />
      )}

      {reviewMessages[branch.id] && (
        <p role="status">{reviewMessages[branch.id]}</p>
      )}

      {hotelReviews[branch.id]?.data.map((review) => (
        <article key={review.id} className="hotel-review-card">
          <p>
            <strong>{review.user.name || "Guest"}</strong>
            {" Â· "}
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </p>

          {review.comment && <p>{review.comment}</p>}

          <small>
            {new Date(review.createdAt).toLocaleDateString("en-ZA")}
          </small>
        </article>
      ))}

      {hotelReviews[branch.id]?.count === 0 && (
        <p>No reviews yet. Be the first to share your experience.</p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmitBranchReview(branch.id);
        }}
      >
        <label>
          Your rating
          <select
            value={reviewRatings[branch.id] ?? 5}
            onChange={(event) =>
              setReviewRatings((previous) => ({
                ...previous,
                [branch.id]: Number(event.target.value),
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
            value={reviewComments[branch.id] ?? ""}
            onChange={(event) =>
              setReviewComments((previous) => ({
                ...previous,
                [branch.id]: event.target.value,
              }))
            }
            placeholder="Share your experience..."
          />
        </label>

        <button
          type="submit"
          className="room-book-button"
          disabled={reviewSubmittingHotelId === branch.id}
        >
          {reviewSubmittingHotelId === branch.id
            ? "Submitting..."
            : "Submit Review"}
        </button>
      </form>
    </div>
  )}
</div>

                  <div className="destination-footer">
                    <div>
                      <span className="branch-price-label">From</span>
                      <strong className="starting-price branch-starting-price">
                        {branchLowestPrice === null
                          ? "Enquire for rates"
                          : `R${branchLowestPrice.toLocaleString("en-ZA")}`}
                      </strong>
                      {branchLowestPrice !== null && <span className="per-night">/ night</span>}
                    </div>
                    <button
                      className="branch-view-stay"
                      type="button"
                      onClick={() => {
                        onViewStay(hotel, branch);
                      }}
                    >
                      View stay
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        </section>
        <section className="rooms-section" id="rooms">
          <div className="section-heading popular-rooms-heading">
            <div>
              <p className="eyebrow"><span /> ROOM COLLECTION</p>
              <h2>Popular <em>rooms.</em></h2>
              <p className="section-note">
                Find the right room for your next stay.
              </p>
            </div>
          </div>

          {!loading && allBranches.length === 0 && !error && (
            <p className="status-message">Room details will appear here soon.</p>
          )}
{availableRoomAmenities.length > 0 && (
  <div className="branch-amenities room-amenity-filters">
    <strong>Filter rooms by amenities</strong>

    <div className="amenity-list">
      {availableRoomAmenities.map((amenity) => (
        <label key={amenity.id} className="amenity-tag">
          <input
            type="checkbox"
            checked={selectedRoomAmenityIds.includes(amenity.id)}
            onChange={(event) => {
              setSelectedRoomAmenityIds((previous) =>
                event.target.checked
                  ? [...previous, amenity.id]
                  : previous.filter((id) => id !== amenity.id),
              );
            }}
          />
          {amenity.name}
        </label>
      ))}
    </div>

    {selectedRoomAmenityIds.length > 0 && (
      <button
        type="button"
        className="login-link sign-out-button"
        onClick={() => setSelectedRoomAmenityIds([])}
      >
        Clear amenity filters
      </button>
    )}
  </div>
)}
          <div className="room-grid popular-room-grid">
           {featuredBranches.flatMap(({ branch }) =>
  (rooms[branch.id] ?? [])
    .filter((room) =>
      selectedRoomAmenityIds.every((amenityId) =>
        room.amenities?.some(
          (item) => item.amenityId === amenityId,
        ),
      ),
    )
    .map((room) => (
                <article className="room-card" key={room.id}>
                  <div className="room-photo">
                    {room.images?.[0] && (
                      <img
                        className="room-photo-image"
                        src={getBranchPhotoUrl(room.images[0])}
                        alt={`${room.name} room`}
                        loading="lazy"
                      />
                    )}
                    {!room.images?.[0] && <div className="room-photo-overlay" />}
                    <span className="room-category">THE GRAND AURELIA</span>
                  </div>
                  <div className="room-card-body">
                    <div className="room-title-row">
                      <h3>{room.name}</h3>
                      <span className="room-capacity">Sleeps {room.capacity} guests</span>
                    </div>
                    <p>{room.description || "A welcoming room for a comfortable stay."}</p>
                    {room.amenities && room.amenities.length > 0 && (
  <div className="branch-amenities room-card-amenities">
    <strong>Room amenities</strong>

    <div className="amenity-list">
      {room.amenities.map(({ amenity }) => (
        <span key={amenity.id} className="amenity-tag">
          {amenity.name}
        </span>
      ))}
    </div>
  </div>
)}
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
    setBookingCheckIn(checkInDate);
    setBookingCheckOut(checkOutDate);
    setBookingAdults(guestCount);
    setBookingChildren(0);
    setBookingQuantity(1);
    setBookingMessage("");
    setBookingError("");
    document.getElementById("booking-form")?.scrollIntoView({
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

       
    </>
  );
}

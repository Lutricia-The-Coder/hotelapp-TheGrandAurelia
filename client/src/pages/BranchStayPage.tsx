import { useState } from "react";
import type { Branch, Hotel, RoomType } from "../types/hotel";
import { getBranchPhotoUrl, getBranchPhotos } from "../utils/branchPhotos";

type BranchStayPageProps = {
  hotel: Hotel;
  branch: Branch;
  rooms: RoomType[];
  favorite: boolean;
  rating: number | null;
  onBack: () => void;
  onViewLocation: () => void;
  onToggleFavorite: () => void;
  onBookRoom: (room: RoomType, checkIn: string, checkOut: string, guests: number) => void;
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1735770517146-e95c872226fc?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1600760380065-2fcdc9e73007?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1588504633950-9dc518941e93?auto=format&fit=crop&w=1400&q=85",
];

export default function BranchStayPage({
  hotel,
  branch,
  rooms,
  favorite,
  rating,
  onBack,
  onViewLocation,
  onToggleFavorite,
  onBookRoom,
}: BranchStayPageProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const photos = getBranchPhotos(branch);
  const photoUrl = (index: number) =>
    photos[index]
      ? getBranchPhotoUrl(photos[index])
      : fallbackImages[index % fallbackImages.length];
  const lowestPrice = rooms.length
    ? Math.min(...rooms.map((room) => room.pricePerNight))
    : null;

  function showAvailability() {
    document.getElementById("stay-available-rooms")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="branch-stay-page">
      <button type="button" className="stay-back-button" onClick={onBack}>
        ← Back to discovery
      </button>

      <div className="stay-gallery" aria-label={`${branch.name} photos`}>
        <img src={photoUrl(0)} alt={`${branch.name} accommodation`} />
        <img src={photoUrl(1)} alt={`${branch.name} guest room`} />
        <img src={photoUrl(2)} alt={`${branch.name} amenities`} />
      </div>

      <div className="stay-details-layout">
        <div className="stay-details-main">
          <div className="stay-location-rating">
            <button
              type="button"
              className="stay-location-link"
              onClick={onViewLocation}
              aria-label={`View ${branch.name} on the app map`}
            >
              ⌖ {branch.city}, {branch.country}
            </button>
            {rating !== null && <span>★ {rating.toFixed(1)}</span>}
          </div>
          <h1>{branch.name}</h1>
          <p className="stay-hotel-name">{hotel.name}</p>
          <p className="stay-description">
            {hotel.description?.trim() ||
              `${branch.name} offers a considered stay in ${branch.city}, with thoughtful comfort and attentive service.`}
          </p>

          {branch.amenities && branch.amenities.length > 0 && (
            <section className="stay-amenities">
              <h2>Amenities</h2>
              <div>
                {branch.amenities.map(({ amenity }) => (
                  <span key={amenity.id}>{amenity.name}</span>
                ))}
              </div>
            </section>
          )}

          <section className="stay-available-rooms" id="stay-available-rooms">
            <h2>Available rooms</h2>
            {rooms.length === 0 ? (
              <p>No rooms are currently listed for this branch.</p>
            ) : (
              rooms.map((room) => (
                <article className="stay-room-card" key={room.id}>
                  {room.images && room.images.length > 0 && (
                    <div className="stay-room-photo-gallery">
                      {room.images.map((image, index) => (
                        <img
                          key={image}
                          className="stay-room-photo"
                          src={getBranchPhotoUrl(image)}
                          alt={`${room.name} at ${branch.name}, photo ${index + 1}`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="stay-room-category">THE GRAND AURELIA</p>
                    <h3>{room.name}</h3>
                    <p>{room.description || `Sleeps up to ${room.capacity} guests`}</p>
                    <small>Sleeps {room.capacity} guests</small>
                  </div>
                  <div className="stay-room-price">
                    <strong>
                      R{room.pricePerNight.toLocaleString("en-ZA")}
                    </strong>
                    <span>/ night</span>
                    <button
                      type="button"
                      className="gold-button"
                      onClick={() => onBookRoom(room, checkIn, checkOut, guests)}
                    >
                      Book now
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>

        <aside className="stay-booking-card">
          <p>From</p>
          <h2>
            {lowestPrice === null
              ? "Enquire for rates"
              : `R${lowestPrice.toLocaleString("en-ZA")} / night`}
          </h2>
          <label>
            CHECK IN
            <input
              type="date"
              value={checkIn}
              min={new Date().toLocaleDateString("en-CA")}
              onChange={(event) => {
                setCheckIn(event.target.value);
                if (checkOut && checkOut <= event.target.value) {
                  setCheckOut("");
                }
              }}
            />
          </label>
          <label>
            CHECK OUT
            <input
              type="date"
              value={checkOut}
              min={
                checkIn
                  ? new Date(new Date(checkIn).getTime() + 86400000)
                      .toISOString()
                      .slice(0, 10)
                  : new Date().toLocaleDateString("en-CA")
              }
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </label>
          <label>
            GUESTS
            <select
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="gold-button stay-availability-button"
            onClick={showAvailability}
          >
            Check availability
          </button>
          <button
            type="button"
            className="stay-favorite-button"
            aria-pressed={favorite}
            onClick={onToggleFavorite}
          >
            {favorite ? "♥ Saved to favourites" : "♡ Add to favourites"}
          </button>
          <small>No payment required to check availability.</small>
        </aside>
      </div>
    </section>
  );
}

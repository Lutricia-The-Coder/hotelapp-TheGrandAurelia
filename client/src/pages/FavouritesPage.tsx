import type { FavoriteBranch, HotelReviewsResponse } from "../api";
import type { Branch, Hotel, RoomType } from "../types/hotel";
import { getBranchPhotoUrl } from "../utils/branchPhotos";
import { ToastMessage } from "../components/ToastNotifications";

type FavouritesPageProps = {
  favoriteBranches: FavoriteBranch[];
  favoritesError: string;
  favoritesMessage: string;
  favoritesLoading: boolean;
  favoriteActionBranchId: string | null;
  allBranches: Branch[];
  hotels: Hotel[];
  rooms: Record<string, RoomType[]>;
  hotelReviews: Record<string, HotelReviewsResponse>;
  handleToggleFavorite: (branch: Branch) => Promise<void>;
  onViewStay: (hotel: Hotel, branch: Branch) => void;
};

function favoriteToBranch(favorite: FavoriteBranch): Branch {
  const { branch } = favorite;
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    country: branch.country,
    images: branch.images,
    coverImage: branch.coverImage,
  };
}

export default function FavouritesPage({
  favoriteBranches,
  favoritesError,
  favoritesMessage,
  favoritesLoading,
  favoriteActionBranchId,
  allBranches,
  hotels,
  rooms,
  hotelReviews,
  handleToggleFavorite,
  onViewStay,
}: FavouritesPageProps) {
  return (
    <section id="favorite-hotels" className="favourites-page">
      <header className="favourites-heading">
        <p className="favourites-eyebrow">YOUR COLLECTION</p>
        <h1>Saved stays</h1>
        <p>Return to the places that caught your eye.</p>
      </header>

      <ToastMessage message={favoritesError} />
      {favoritesMessage && (
        <p className="favourites-feedback" role="status">
          {favoritesMessage}
        </p>
      )}

      {favoritesLoading ? (
        <div className="favourites-empty-state" role="status">
          <span className="favourites-loading-mark" aria-hidden="true" />
          <p>Loading saved stays...</p>
        </div>
      ) : favoriteBranches.length === 0 ? (
        <div className="favourites-empty-state">
          <span className="favourites-empty-heart" aria-hidden="true">♡</span>
          <h2>Your collection is waiting</h2>
          <p>You haven’t saved any branches yet. Explore stays and save the ones you love.</p>
        </div>
      ) : (
        <div className="favourites-grid">
          {favoriteBranches.map((favorite) => {
            const favoriteBranch = favorite.branch;
            const branch =
              allBranches.find((item) => item.id === favoriteBranch.id) ??
              favoriteToBranch(favorite);
            const hotel =
              hotels.find((item) => item.id === favoriteBranch.hotel.id) ??
              {
                id: favoriteBranch.hotel.id,
                name: favoriteBranch.hotel.name,
                description: favoriteBranch.hotel.description ?? undefined,
              };
            const branchRooms = rooms[branch.id] ?? [];
            const startingPrice = branchRooms.length
              ? Math.min(...branchRooms.map((room) => Number(room.pricePerNight)))
              : null;
            const rating = hotelReviews[branch.id]?.averageRating;
            const photo =
              branch.coverImage ||
              branch.images?.[0] ||
              null;

            return (
              <article className="favourite-stay-card" key={branch.id}>
                <div className="favourite-stay-photo">
                  {photo ? (
                    <img
                      src={getBranchPhotoUrl(photo)}
                      alt={`${branch.name} at ${hotel.name}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="favourite-photo-placeholder" aria-hidden="true">
                      <span>A</span>
                    </div>
                  )}
                  <div className="favourite-photo-shade" />
                  <span className="favourite-collection-tag">THE GRAND AURELIA</span>
                  <button
                    type="button"
                    className="favourite-heart"
                    aria-label={`Remove ${branch.name} from favourites`}
                    title="Remove from favourites"
                    disabled={favoriteActionBranchId === branch.id}
                    onClick={() => void handleToggleFavorite(branch)}
                  >
                    {favoriteActionBranchId === branch.id ? (
                      <span className="favourite-heart-loading">…</span>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="favourite-stay-content">
                  <div className="favourite-stay-meta">
                    <span className="favourite-location">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {branch.city}, {branch.country}
                    </span>
                    {rating !== undefined && rating !== null && (
                      <span className="favourite-rating" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
                        <span aria-hidden="true">★</span> {rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="favourite-hotel-name">{hotel.name}</p>
                  <h2>{branch.name}</h2>
                  <p className="favourite-description">
                    {hotel.description || branch.address}
                  </p>

                  <div className="favourite-stay-footer">
                    <div className="favourite-price">
                      <span>From</span>
                      <strong>
                        {startingPrice === null
                          ? "Enquire for rates"
                          : `R${startingPrice.toLocaleString("en-ZA")}`}
                      </strong>
                      {startingPrice !== null && <span>/ night</span>}
                    </div>
                    <button
                      type="button"
                      className="favourite-view-button"
                      onClick={() => onViewStay(hotel, branch)}
                    >
                      View stay
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

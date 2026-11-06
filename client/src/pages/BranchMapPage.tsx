import type { Branch } from "../types/hotel";
import { ToastMessage } from "../components/ToastNotifications";

type BranchMapPageProps = {
  branches: Branch[];
  loading: boolean;
  error: string;
  onBack: () => void;
};

function getBranchMapUrl(branches: Branch[]) {
  const locations = branches.map(
    (branch) =>
      `${branch.address}, ${branch.city}, ${branch.country}`,
  );

  if (locations.length === 0) return null;

  if (locations.length === 1) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(locations[0])}&output=embed`;
  }

  return `https://maps.google.com/maps?saddr=${encodeURIComponent(
    locations[0],
  )}&daddr=${encodeURIComponent(
    locations.slice(1).map((location) => `to:${location}`).join("+"),
  )}&output=embed`;
}

export default function BranchMapPage({
  branches,
  loading,
  error,
  onBack,
}: BranchMapPageProps) {
  const mapUrl = getBranchMapUrl(branches);

  return (
    <section className="branch-map-page">
      <button type="button" className="stay-back-button" onClick={onBack}>
        ← Back to discovery
      </button>
      <header className="branch-map-page-heading">
        <p className="eyebrow"><span /> FIND YOUR WAY</p>
        <h1>Our branches <em>on the map.</em></h1>
        <p>Explore the locations of all The Grand Aurelia branches.</p>
      </header>

      {loading ? (
        <p className="status-message">Loading branch locations...</p>
      ) : error ? (
        <ToastMessage message={error} />
      ) : mapUrl ? (
        <>
          <iframe
            className="branch-map-frame branch-map-page-frame"
            title="Map showing all The Grand Aurelia branch locations"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="branch-map-location-list">
            {branches.map((branch) => (
              <a
                key={branch.id}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${branch.name}, ${branch.address}, ${branch.city}, ${branch.country}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden="true">⌖</span>
                <span>
                  <strong>{branch.name}</strong>
                  <small>{branch.city}, {branch.country}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <p className="status-message">No branch locations are available yet.</p>
      )}
    </section>
  );
}

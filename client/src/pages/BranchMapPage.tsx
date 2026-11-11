import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import type { Branch } from "../types/hotel";
import { ToastMessage } from "../components/ToastNotifications";

type BranchMapPageProps = {
  branches: Branch[];
  loading: boolean;
  error: string;
  selectedBranchId?: string | null;
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
  selectedBranchId = null,
  onBack,
}: BranchMapPageProps) {
  const mapBranches = selectedBranchId
    ? branches.filter((branch) => branch.id === selectedBranchId)
    : branches;
  const selectedBranch = mapBranches[0];
  const mapUrl = getBranchMapUrl(mapBranches);

  return (
    <section className="branch-map-page">
      <button type="button" className="stay-back-button" onClick={onBack}>
        <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" /> Back to discovery
      </button>
      <header className="branch-map-page-heading">
        <p className="eyebrow"><span /> FIND YOUR WAY</p>
        <h1>
          {selectedBranch ? (
            <>{selectedBranch.name} <em>on the map.</em></>
          ) : (
            <>Our branches <em>on the map.</em></>
          )}
        </h1>
        <p>
          {selectedBranch
            ? `Find ${selectedBranch.name} in ${selectedBranch.city}, ${selectedBranch.country}.`
            : "Explore the locations of all The Grand Aurelia branches."}
        </p>
      </header>

      {loading ? (
        <p className="status-message">Loading branch locations...</p>
      ) : error ? (
        <ToastMessage message={error} />
      ) : mapUrl ? (
        <>
          <iframe
            className="branch-map-frame branch-map-page-frame"
            title={
              selectedBranch
                ? `Map showing ${selectedBranch.name}`
                : "Map showing all The Grand Aurelia branch locations"
            }
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="branch-map-location-list">
            {mapBranches.map((branch) => (
              <a
                key={branch.id}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${branch.name}, ${branch.address}, ${branch.city}, ${branch.country}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  <strong>{branch.name}</strong>
                  <small>{branch.city}, {branch.country}</small>
                </span>
                <ArrowUpRight size={14} strokeWidth={2.1} aria-hidden="true" />
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

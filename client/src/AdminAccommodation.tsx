import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { API_BASE_URL } from "./api";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
function getBranchPhotoUrl(photoPath: string): string {
  if (/^https?:\/\//i.test(photoPath)) return photoPath;
  return `${API_ORIGIN}${photoPath.startsWith("/") ? "" : "/"}${photoPath}`;
}

type RoomRecord = {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  pricePerNight: number | string;
  totalRooms: number;
};

type PendingBranchPhoto = { file: File; previewUrl: string; };

type BranchRecord = {
  id: string;
  hotelId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  cancellationPolicy?: string | null;
  images?: string[];
  coverImage?: string | null;
  roomTypes?: RoomRecord[];
  
};

type HotelRecord = {
  id: string;
  name: string;
  description?: string | null;
  branches: BranchRecord[];
};

type HotelForm = {
  id: string | null;
  name: string;
  description: string;
};

type BranchForm = {
  id: string | null;
  hotelId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
};

type RoomForm = {
  id: string | null;
  branchId: string;
  name: string;
  description: string;
  capacity: string;
  pricePerNight: string;
  totalRooms: string;
};

function newHotelForm(): HotelForm {
  return { id: null, name: "", description: "" };
}

function newBranchForm(hotelId = ""): BranchForm {
  return {
    id: null,
    hotelId,
    name: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    checkInTime: "",
    checkOutTime: "",
    cancellationPolicy: "",
  };
}

function newRoomForm(branchId = ""): RoomForm {
  return {
    id: null,
    branchId,
    name: "",
    description: "",
    capacity: "2",
    pricePerNight: "",
    totalRooms: "1",
  };
}

async function adminRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = sessionStorage.getItem("hotelAuthToken");

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const isMultipart =
    body !== undefined && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && !isMultipart
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(body !== undefined
      ? {
          body: isMultipart ? body : JSON.stringify(body),
        }
      : {}),
  });

  const result = (await response.json()) as {
    success?: boolean;
    data?: T;
    message?: string;
  };

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "The admin request failed.");
  }

  return result.data as T;
}
export default function AdminAccommodation() {
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [hotelForm, setHotelForm] = useState<HotelForm>(newHotelForm());
  const [branchForm, setBranchForm] = useState<BranchForm>(
    newBranchForm(),
  );
  const [roomForm, setRoomForm] = useState<RoomForm>(newRoomForm());
  const [existingBranchImages, setExistingBranchImages] = useState<string[]>([]);
  const [pendingBranchPhotos, setPendingBranchPhotos] = useState<PendingBranchPhoto[]>([]);
  const [coverImageSelection, setCoverImageSelection] = useState("");

  function clearBranchPhotoSelection() {
    pendingBranchPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setExistingBranchImages([]);
    setPendingBranchPhotos([]);
    setCoverImageSelection("");
  }

  function startNewBranch(hotelId: string) {
    clearBranchPhotoSelection();
    setBranchForm(newBranchForm(hotelId));
    clearFeedback();
  }

  function editBranch(branch: BranchRecord, hotelId: string) {
    clearBranchPhotoSelection();
    const images = branch.images ?? [];
    setExistingBranchImages(images);
    setCoverImageSelection(branch.coverImage || images[0] || "");
    setBranchForm({
      id: branch.id, hotelId, name: branch.name, address: branch.address,
      city: branch.city, country: branch.country, phone: branch.phone || "",
      checkInTime: branch.checkInTime || "", checkOutTime: branch.checkOutTime || "",
      cancellationPolicy: branch.cancellationPolicy || "",
    });
    clearFeedback();
  }
function handleBranchPhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []) as File[];
    event.target.value = "";
    if (!selectedFiles.length) return;

    const availableSlots = 8 - existingBranchImages.length - pendingBranchPhotos.length;
    if (availableSlots <= 0) {
      setError("A branch can have a maximum of 8 photos.");
      return;
    }

    const acceptedFiles: PendingBranchPhoto[] = [];
    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPG, PNG and WEBP images are allowed.");
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Each photo must be 5 MB or smaller.");
        break;
      }
      if (acceptedFiles.length >= availableSlots) {
        setError("A branch can have a maximum of 8 photos.");
        break;
      }
      acceptedFiles.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (acceptedFiles.length) {
      const firstIndex = pendingBranchPhotos.length;
      setPendingBranchPhotos((current) => [...current, ...acceptedFiles]);
      if (!coverImageSelection && existingBranchImages.length === 0) {
        setCoverImageSelection(`new:${firstIndex}`);
      }
    }
  }

  function removeExistingBranchImage(photoUrl: string) {
    const nextImages = existingBranchImages.filter((image) => image !== photoUrl);
    setExistingBranchImages(nextImages);
    if (coverImageSelection === photoUrl) {
      setCoverImageSelection(nextImages[0] || (pendingBranchPhotos.length ? "new:0" : ""));
    }
  }
 function removePendingBranchPhoto(index: number) {
    const removed = pendingBranchPhotos[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    const nextPhotos = pendingBranchPhotos.filter((_, i) => i !== index);
    setPendingBranchPhotos(nextPhotos);
    if (coverImageSelection === `new:${index}`) {
      setCoverImageSelection(existingBranchImages[0] || (nextPhotos.length ? "new:0" : ""));
    } else if (coverImageSelection.startsWith("new:")) {
      const selectedIndex = Number(coverImageSelection.slice(4));
      if (selectedIndex > index) setCoverImageSelection(`new:${selectedIndex - 1}`);
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const hotelRows = await adminRequest<HotelRecord[]>("/hotels");

      const completeHotels = await Promise.all(
        hotelRows.map(async (hotel) => {
          const branches = await adminRequest<BranchRecord[]>(
            `/branches/hotel/${encodeURIComponent(hotel.id)}`,
          );

          return {
            ...hotel,
            branches,
          };
        }),
      );
setHotels(completeHotels);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load accommodation.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function saveHotel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (!hotelForm.name.trim()) {
      setError("Enter a hotel name.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: hotelForm.name.trim(),
        description: hotelForm.description.trim() || null,
      };

      if (hotelForm.id) {
        await adminRequest(
          `/hotels/${encodeURIComponent(hotelForm.id)}`,
          "PUT",
          payload,
        );
        setMessage("Hotel updated successfully.");
      } else {
        await adminRequest("/hotels", "POST", payload);
        setMessage("Hotel created successfully.");
      }

      setHotelForm(newHotelForm());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save hotel.");
    } finally {
      setSaving(false);
    }
  }
async function deleteHotel(hotel: HotelRecord) {
    clearFeedback();

    const confirmed = window.confirm(
      `Delete "${hotel.name}" and its branches and room types? Existing reservations may prevent deletion.`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await adminRequest(
        `/hotels/${encodeURIComponent(hotel.id)}`,
        "DELETE",
      );

      if (hotelForm.id === hotel.id) {
        setHotelForm(newHotelForm());
      }

      setMessage("Hotel deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete hotel.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (!branchForm.hotelId || !branchForm.name.trim() || !branchForm.address.trim() ||
        !branchForm.city.trim() || !branchForm.country.trim()) {
      setError("Complete all required branch fields.");
      return;
    }
    if (existingBranchImages.length + pendingBranchPhotos.length > 8) {
      setError("A branch can have a maximum of 8 photos.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", branchForm.name.trim());
      formData.append("address", branchForm.address.trim());
      formData.append("city", branchForm.city.trim());
      formData.append("country", branchForm.country.trim());

      if (branchForm.id) {
        formData.append("phone", branchForm.phone.trim());
        formData.append("checkInTime", branchForm.checkInTime.trim());
        formData.append("checkOutTime", branchForm.checkOutTime.trim());
        formData.append("cancellationPolicy", branchForm.cancellationPolicy.trim());
        formData.append("existingImages", JSON.stringify(existingBranchImages));
      } else {
        formData.append("hotelId", branchForm.hotelId);
      }

      formData.append("coverImage", coverImageSelection);
      pendingBranchPhotos.forEach((photo) => formData.append("photos", photo.file));

      if (branchForm.id) {
        await adminRequest(`/branches/${encodeURIComponent(branchForm.id)}`, "PUT", formData);
        setMessage("Branch updated successfully.");
      } else {
        await adminRequest("/branches", "POST", formData);
        setMessage("Branch created successfully.");
      }

      clearBranchPhotoSelection();
      setBranchForm(newBranchForm());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBranch(branch: BranchRecord) {
    clearFeedback();

    const confirmed = window.confirm(
      `Delete "${branch.name}" and all its room types? Reservations may prevent deletion.`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await adminRequest(
        `/branches/${encodeURIComponent(branch.id)}`,
        "DELETE",
      );

      if (branchForm.id === branch.id) {
        clearBranchPhotoSelection();
        setBranchForm(newBranchForm());
      }

      if (roomForm.branchId === branch.id) {
        setRoomForm(newRoomForm());
      }

      setMessage("Branch deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete branch.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const capacity = Number(roomForm.capacity);
    const pricePerNight = Number(roomForm.pricePerNight);
    const totalRooms = Number(roomForm.totalRooms);
    if (
      !roomForm.name.trim() ||
      !roomForm.branchId ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      !Number.isFinite(pricePerNight) ||
      pricePerNight < 0 ||
      !Number.isInteger(totalRooms) ||
      totalRooms < 1
    ) {
      setError(
        "Enter a room name, positive capacity, valid nightly price and positive room count.",
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: roomForm.name.trim(),
        description: roomForm.description.trim() || null,
        capacity,
        pricePerNight,
        totalRooms,
        ...(!roomForm.id ? { branchId: roomForm.branchId } : {}),
      };

      if (roomForm.id) {
        await adminRequest(
          `/rooms/${encodeURIComponent(roomForm.id)}`,
          "PUT",
          payload,
        );
        setMessage("Room type updated successfully.");
      } else {
        await adminRequest("/rooms", "POST", payload);
        setMessage("Room type created successfully.");
      }

      setRoomForm(newRoomForm());
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save room type.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function deleteRoom(room: RoomRecord) {
    clearFeedback();

    if (
      !window.confirm(
        `Delete the "${room.name}" room type? Existing reservations may prevent deletion.`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      await adminRequest(
        `/rooms/${encodeURIComponent(room.id)}`,
        "DELETE",
      );

      if (roomForm.id === room.id) {
        setRoomForm(newRoomForm());
      }

      setMessage("Room type deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete room type.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="admin-accommodation" className="admin-accommodation">
      <div className="admin-accommodation-heading">
        <div>
          <p className="admin-eyebrow">PROPERTY MANAGEMENT</p>
          <h2>Accommodation Management</h2>
          <p>
            Manage hotels, branches, room types, guest capacity and nightly
            pricing.
          </p>
        </div>

        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => void loadData()}
          disabled={loading || saving}
        >
          Refresh accommodation
        </button>
      </div>

      {error && (
        <p className="admin-feedback admin-feedback-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="admin-feedback admin-feedback-success" role="status">
          {message}
        </p>
      )}
        <form className="admin-form-card" onSubmit={saveHotel}>
        <h3>{hotelForm.id ? "Edit hotel" : "Add a hotel"}</h3>

        <div className="admin-form-grid">
          <label>
            Hotel name *
            <input
              value={hotelForm.name}
              onChange={(event) =>
                setHotelForm({
                  ...hotelForm,
                  name: event.target.value,
                })
              }
              required
              maxLength={150}
            />
          </label>

          <label>
            Description
            <textarea
              value={hotelForm.description}
              onChange={(event) =>
                setHotelForm({
                  ...hotelForm,
                  description: event.target.value,
                })
              }
              rows={3}
            />
          </label>
        </div>
  <div className="admin-form-actions">
          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : hotelForm.id
                ? "Save hotel changes"
                : "Create hotel"}
          </button>

          {hotelForm.id && (
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => setHotelForm(newHotelForm())}
              disabled={saving}
            >
              Stop editing
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading accommodation...</p>
      ) : hotels.length === 0 ? (
        <p>No hotels have been created yet.</p>
      ) : (
        <div className="admin-hotel-list">
          {hotels.map((hotel) => (
            <article className="admin-hotel-card" key={hotel.id}>
              <div className="admin-entity-heading">
                <div>
                  <h3>{hotel.name}</h3>
                  <p>{hotel.description || "No description provided."}</p>
                  <small>{hotel.branches.length} branch(es)</small>
                </div>

                <div className="admin-inline-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() =>
                      setHotelForm({
                        id: hotel.id,
                        name: hotel.name,
                        description: hotel.description || "",
                      })
                    }
                    disabled={saving}
                  >
                    Edit hotel
                  </button>
                    <button
                    type="button"
                    className="admin-danger-button"
                    onClick={() => void deleteHotel(hotel)}
                    disabled={saving}
                  >
                    Delete hotel
                  </button>
                </div>
              </div>

              <div className="admin-branch-list">
                <div className="admin-subheading">
                  <h4>Branches</h4>
                  <button
                    type="button"
                    onClick={() => startNewBranch(hotel.id)}
                    disabled={saving}
                  >
                    + Add branch
                  </button>
                </div>

                {branchForm.hotelId === hotel.id && (
                  <form
                    className="admin-form-card admin-nested-form"
                    onSubmit={saveBranch}
                  >
                    <h4>
                      {branchForm.id ? "Edit branch" : "Create branch"}
                    </h4>

                    <div className="admin-form-grid">
                      <label>
                        Branch name *
                        <input
                          value={branchForm.name}
                          onChange={(event) =>
                            setBranchForm({
                              ...branchForm,
                              name: event.target.value,
                            })
                          }
                          required
                        />
                      </label>

                      <label>
                        Address *
                        <input
                          value={branchForm.address}
                          onChange={(event) =>
                            setBranchForm({
                              ...branchForm,
                              address: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      
                      <label>
                        City *
                        <input
                          value={branchForm.city}
                          onChange={(event) =>
                            setBranchForm({
                              ...branchForm,
                              city: event.target.value,
                            })
                          }
                          required
                        />
                      </label>

                      <label>
                        Country *
                        <input
                          value={branchForm.country}
                          onChange={(event) =>
                            setBranchForm({
                              ...branchForm,
                              country: event.target.value,
                            })
                          }
                          required
                        />
                      </label>

                      {branchForm.id && (
                        <>
                          <label>
                            Phone
                            <input
                              value={branchForm.phone}
                              onChange={(event) =>
                                setBranchForm({
                                  ...branchForm,
                                  phone: event.target.value,
                                })
                              }
                            />
                          </label>

                          <label>
                            Check-in time
                            <input
                              value={branchForm.checkInTime}
                              onChange={(event) =>
                                setBranchForm({
                                  ...branchForm,
                                  checkInTime: event.target.value,
                                })
                              }
                              placeholder="e.g. 14:00"
                            />
                          </label>

                          <label>
                            Check-out time
                            <input
                              value={branchForm.checkOutTime}
                              onChange={(event) =>
                                setBranchForm({
                                  ...branchForm,
                                  checkOutTime: event.target.value,
                                })
                              }
                              placeholder="e.g. 10:00"
                            />
                          </label>

                          <label>
                            Cancellation policy
                            <textarea
                              value={branchForm.cancellationPolicy}
                              onChange={(event) =>
                                setBranchForm({
                                  ...branchForm,
                                  cancellationPolicy: event.target.value,
                                })
                              }
                              rows={3}
                            />
                          </label>
                        </>
                      )}
                    </div>
 <div style={{ marginTop: 18 }}>
                      <h5>Branch photos</h5>
                      <p style={{ margin: "6px 0 12px", color: "#666" }}>
                        Add up to 8 JPG, PNG or WEBP photos. Each photo must be 5 MB or smaller.
                        Choose one image as the cover photo.
                      </p>
                      <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        Add photos
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                          onChange={handleBranchPhotoSelection}
                          disabled={saving || existingBranchImages.length + pendingBranchPhotos.length >= 8} />
                      </label>
                      {(existingBranchImages.length > 0 || pendingBranchPhotos.length > 0) ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginTop: 14 }}>
                          {existingBranchImages.map((photoUrl) => (
                            <div key={photoUrl} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
                              <img src={getBranchPhotoUrl(photoUrl)} alt="Branch"
                                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 5 }} />
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                                <button type="button" className="admin-secondary-button"
                                  onClick={() => setCoverImageSelection(photoUrl)} disabled={saving}>
                                  {coverImageSelection === photoUrl ? "Cover photo" : "Set as cover"}
                                </button>
                                <button type="button" className="admin-danger-button"
                                  onClick={() => removeExistingBranchImage(photoUrl)} disabled={saving}>Remove</button>
                              </div>
                            </div>
                          ))}
                          {pendingBranchPhotos.map((photo, index) => (
                            <div key={photo.previewUrl} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
                              <img src={photo.previewUrl} alt={photo.file.name}
                                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 5 }} />
                              <small style={{ display: "block", overflowWrap: "anywhere", marginTop: 6 }}>{photo.file.name}</small>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                                <button type="button" className="admin-secondary-button"
                                  onClick={() => setCoverImageSelection(`new:${index}`)} disabled={saving}>
                                  {coverImageSelection === `new:${index}` ? "Cover photo" : "Set as cover"}
                                </button>
                                <button type="button" className="admin-danger-button"
                                  onClick={() => removePendingBranchPhoto(index)} disabled={saving}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p style={{ marginTop: 10 }}>No branch photos selected.</p>}
                    </div>

                    <div className="admin-form-actions">
                      <button type="submit" disabled={saving}>
                        {branchForm.id ? "Save branch" : "Create branch"}
                      </button>
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => {
                          clearBranchPhotoSelection();
                          setBranchForm(newBranchForm());
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {hotel.branches.map((branch) => (
                  <article className="admin-branch-card" key={branch.id}>
                    <div className="admin-entity-heading">
                      <div>
                        <h4>{branch.name}</h4>
                        <p>
                          {branch.address}, {branch.city}, {branch.country}
                        </p>
                        <small>
                          {branch.roomTypes?.length ?? 0} room type(s)
                        </small>
                      </div>
                       <div className="admin-inline-actions">
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => editBranch(branch, hotel.id)}
                          disabled={saving}
                        >
                          Edit branch
                        </button>

                        <button
                          type="button"
                          className="admin-danger-button"
                          onClick={() => void deleteBranch(branch)}
                          disabled={saving}
                        >
                          Delete branch
                        </button>
                      </div>
                    </div>

                    {branch.coverImage && (
                      <img src={getBranchPhotoUrl(branch.coverImage)} alt={`${branch.name} cover`}
                        style={{ width: "100%", maxWidth: 320, height: 150, objectFit: "cover", borderRadius: 8, margin: "12px 0" }} />
                    )}

                    <div className="admin-subheading">
                      <h5>Room types</h5>
                      <button
                        type="button"
                        onClick={() =>
                          setRoomForm(newRoomForm(branch.id))
                        }
                        disabled={saving}
                      >
                        + Add room type
                      </button>
                    </div>

                    {roomForm.branchId === branch.id && (
                     <form
                        className="admin-form-card admin-nested-form"
                        onSubmit={saveRoom}
                      >
                        <h5>
                          {roomForm.id ? "Edit room type" : "Create room type"}
                        </h5>

                        <div className="admin-form-grid">
                          <label>
                            Room type name *
                            <input
                              value={roomForm.name}
                              onChange={(event) =>
                                setRoomForm({
                                  ...roomForm,
                                  name: event.target.value,
                                })
                              }
                              required
                            />
                          </label>

                          <label>
                            Description
                            <textarea
                              value={roomForm.description}
                              onChange={(event) =>
                                setRoomForm({
                                  ...roomForm,
                                  description: event.target.value,
                                })
                              }
                              rows={2}
                            />
                          </label>

                          <label>
                            Guest capacity *
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={roomForm.capacity}
                              onChange={(event) =>
                                setRoomForm({
                                  ...roomForm,
                                  capacity: event.target.value,
                                })
                              }
                              required
                            />
                          </label>

                          <label>
                            Price per night (ZAR) *
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={roomForm.pricePerNight}
                              onChange={(event) =>
                                setRoomForm({
                                  ...roomForm,
                                  pricePerNight: event.target.value,
                                })
                              }
                              required
                            />
                          </label>

                          <label>
                            Total rooms *
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={roomForm.totalRooms}
                              onChange={(event) =>
                                setRoomForm({
                                  ...roomForm,
                                  totalRooms: event.target.value,
                                })
                              }
                              required
                            />
                          </label>
                        </div>
                         <div className="admin-form-actions">
                          <button type="submit" disabled={saving}>
                            {roomForm.id ? "Save room type" : "Create room type"}
                          </button>
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => setRoomForm(newRoomForm())}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="admin-room-list">
                      {(branch.roomTypes ?? []).length === 0 ? (
                        <p>No room types added to this branch.</p>
                      ) : (
                        branch.roomTypes?.map((room) => (
                          <div className="admin-room-row" key={room.id}>
                            <div>
                              <strong>{room.name}</strong>
                              <p>
                                Capacity: {room.capacity} Â· Rooms:{" "}
                                {room.totalRooms} Â· Nightly rate:{" "}
                                {Number(room.pricePerNight).toLocaleString(
                                  "en-ZA",
                                  {
                                    style: "currency",
                                    currency: "ZAR",
                                  },
                                )}
                              </p>
                              {room.description && <small>{room.description}</small>}
                            </div>

                            <div className="admin-inline-actions">
                              <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={() =>
                                  setRoomForm({
                                    id: room.id,
                                    branchId: branch.id,
                                    name: room.name,
                                    description: room.description || "",
                                    capacity: String(room.capacity),
                                    pricePerNight: String(room.pricePerNight),
                                    totalRooms: String(room.totalRooms),
                                  })
                                }
                                disabled={saving}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="admin-danger-button"
                                onClick={() => void deleteRoom(room)}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

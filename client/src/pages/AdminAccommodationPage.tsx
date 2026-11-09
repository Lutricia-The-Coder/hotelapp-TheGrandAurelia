import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { API_BASE_URL } from "../api";
import useConfirmDialog from "../components/ConfirmDialog";
import { ToastMessage } from "../components/ToastNotifications";


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
  roomTypeOptionId: string;
  roomTypeOption?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  amenities?: {
    amenityId: string;
    amenity: {
      id: string;
      name: string;
    };
  }[];
  images?: string[];
};
type RoomTypeOptionRecord = {
  id: string;
  name: string;
  isActive: boolean;
};

type AmenityRecord = {
  id: string;
  name: string;
  _count?: {
    branches: number;
    roomTypes: number;
  };
};
type PendingBranchPhoto = { file: File; previewUrl: string; };
type PendingRoomPhoto = { file: File; previewUrl: string; };

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
  roomTypeOptionId: string;
  description: string;
  capacity: string;
  pricePerNight: string;
  totalRooms: string;
  amenityIds: string[];
};


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
    roomTypeOptionId: "",
    description: "",
    capacity: "2",
    pricePerNight: "",
    totalRooms: "1",
    amenityIds: [],
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
export default function AdminAccommodation({
  onBranchesChanged,
  section,
}: {
  onBranchesChanged?: () => Promise<void>;
  section: "branches" | "rooms";
}) {
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<RoomTypeOptionRecord[]>([]);
const [amenities, setAmenities] = useState<AmenityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");


  const [branchForm, setBranchForm] = useState<BranchForm>(
    newBranchForm(),
  );
  const [roomForm, setRoomForm] = useState<RoomForm>(newRoomForm());
  const [roomTypeOptionName, setRoomTypeOptionName] = useState("");
const [editingRoomTypeOptionId, setEditingRoomTypeOptionId] = useState<string | null>(null);

const [amenityName, setAmenityName] = useState("");
const [editingAmenityId, setEditingAmenityId] = useState<string | null>(null);
  const [existingBranchImages, setExistingBranchImages] = useState<string[]>([]);
  const [pendingBranchPhotos, setPendingBranchPhotos] = useState<PendingBranchPhoto[]>([]);
  const [coverImageSelection, setCoverImageSelection] = useState("");
  const [existingRoomImages, setExistingRoomImages] = useState<string[]>([]);
  const [pendingRoomPhotos, setPendingRoomPhotos] = useState<PendingRoomPhoto[]>([]);
  const pendingRoomPhotosRef = useRef<PendingRoomPhoto[]>([]);
  const branchFormRef = useRef<HTMLFormElement>(null);
  const { confirm, dialog } = useConfirmDialog();

  useEffect(
    () => () => {
      pendingRoomPhotosRef.current.forEach((photo) =>
        URL.revokeObjectURL(photo.previewUrl),
      );
    },
    [],
  );

  useEffect(() => {
    if (!branchForm.hotelId) return;
    branchFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    branchFormRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [branchForm.hotelId, branchForm.id]);

  function clearBranchPhotoSelection() {
    pendingBranchPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setExistingBranchImages([]);
    setPendingBranchPhotos([]);
    setCoverImageSelection("");
  }

  function updatePendingRoomPhotos(photos: PendingRoomPhoto[]) {
    pendingRoomPhotosRef.current = photos;
    setPendingRoomPhotos(photos);
  }

  function clearRoomPhotoSelection() {
    pendingRoomPhotosRef.current.forEach((photo) =>
      URL.revokeObjectURL(photo.previewUrl),
    );
    pendingRoomPhotosRef.current = [];
    setExistingRoomImages([]);
    setPendingRoomPhotos([]);
  }

  function startNewRoom(branchId: string) {
    clearRoomPhotoSelection();
    setRoomForm(newRoomForm(branchId));
    clearFeedback();
  }

  function editRoom(room: RoomRecord, branchId: string) {
    clearRoomPhotoSelection();
    setExistingRoomImages(room.images ?? []);
    setRoomForm({
      id: room.id,
      branchId,
      roomTypeOptionId: room.roomTypeOptionId,
      description: room.description || "",
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      totalRooms: String(room.totalRooms),
      amenityIds: room.amenities?.map((item) => item.amenityId) ?? [],
    });
    clearFeedback();
  }

  function handleRoomPhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const availableSlots =
      8 - existingRoomImages.length - pendingRoomPhotos.length;
    if (availableSlots <= 0) {
      setError("A room type can have a maximum of 8 photos.");
      return;
    }

    const acceptedPhotos: PendingRoomPhoto[] = [];
    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPG, PNG and WEBP images are allowed.");
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Each photo must be 5 MB or smaller.");
        break;
      }
      if (acceptedPhotos.length >= availableSlots) {
        setError("A room type can have a maximum of 8 photos.");
        break;
      }
      acceptedPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (acceptedPhotos.length > 0) {
      updatePendingRoomPhotos([...pendingRoomPhotos, ...acceptedPhotos]);
    }
  }

  function removeExistingRoomImage(photoUrl: string) {
    setExistingRoomImages((images) =>
      images.filter((image) => image !== photoUrl),
    );
  }

  function removePendingRoomPhoto(index: number) {
    const removed = pendingRoomPhotos[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    updatePendingRoomPhotos(
      pendingRoomPhotos.filter((_, photoIndex) => photoIndex !== index),
    );
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
    try {
     const [hotelRows, optionRows, amenityRows] = await Promise.all([
  adminRequest<HotelRecord[]>("/hotels"),
  adminRequest<RoomTypeOptionRecord[]>("/room-type-options/admin"),
  adminRequest<AmenityRecord[]>("/amenities/admin"),
]);

setRoomTypeOptions(optionRows);
setAmenities(amenityRows);

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
    void Promise.resolve().then(loadData);
  }, [loadData]);

  function clearFeedback() {
    setError("");
    setMessage("");
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

    const branchAction = branchForm.id ? "Save changes to" : "Create";
    if (!(await confirm({
      title: `${branchAction} branch?`,
      message: `Are you sure you want to ${branchAction.toLowerCase()} branch "${branchForm.name.trim()}"?`,
      confirmLabel: branchForm.id ? "Save changes" : "Create branch",
    }))) {
      return;
    }

    setBusyAction(branchForm.id ? "Saving branch changes..." : "Creating branch...");
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
      await onBranchesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch.");
    } finally {
      setSaving(false);
      setBusyAction("");
    }
  }

  async function deleteBranch(branch: BranchRecord) {
    clearFeedback();

    const confirmed = await confirm({
      title: "Delete branch?",
      message: `Delete "${branch.name}" and all its room types? Reservations may prevent deletion.`,
      confirmLabel: "Delete branch",
      destructive: true,
    });

    if (!confirmed) return;

    setBusyAction("Deleting branch...");
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
        clearRoomPhotoSelection();
        setRoomForm(newRoomForm());
      }

      setMessage("Branch deleted successfully.");
      await loadData();
      await onBranchesChanged?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete branch.",
      );
    } finally {
      setSaving(false);
      setBusyAction("");
    }
  }

 async function saveRoom(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  clearFeedback();

  const capacity = Number(roomForm.capacity);
  const pricePerNight = Number(roomForm.pricePerNight);
  const totalRooms = Number(roomForm.totalRooms);

  if (
    !roomForm.roomTypeOptionId ||
    !roomForm.branchId ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    !Number.isFinite(pricePerNight) ||
    pricePerNight < 0 ||
    !Number.isInteger(totalRooms) ||
    totalRooms < 1
  ) {
    setError(
      "Select a room type and enter a positive capacity, valid nightly price and positive room count.",
    );
    return;
  }

  const roomAction = roomForm.id ? "Save changes to" : "Create";
  if (!(await confirm({
    title: `${roomAction} room type?`,
    message: `Are you sure you want to ${roomAction.toLowerCase()} this room type?`,
    confirmLabel: roomForm.id ? "Save changes" : "Create room type",
  }))) return;

  setBusyAction(roomForm.id ? "Saving room type changes..." : "Creating room type...");
  setSaving(true);

  try {
    const formData = new FormData();
    formData.append("roomTypeOptionId", roomForm.roomTypeOptionId);
    formData.append("amenityIds", JSON.stringify(roomForm.amenityIds));
    formData.append("description", roomForm.description.trim());
    formData.append("capacity", String(capacity));
    formData.append("pricePerNight", String(pricePerNight));
    formData.append("totalRooms", String(totalRooms));
    formData.append("existingImages", JSON.stringify(existingRoomImages));
    if (!roomForm.id) {
      formData.append("branchId", roomForm.branchId);
    }
    pendingRoomPhotos.forEach((photo) =>
      formData.append("photos", photo.file),
    );

    if (roomForm.id) {
      await adminRequest(
        `/rooms/${encodeURIComponent(roomForm.id)}`,
        "PUT",
        formData,
      );
      setMessage("Room type updated successfully.");
    } else {
      await adminRequest("/rooms", "POST", formData);
      setMessage("Room type created successfully.");
    }

    clearRoomPhotoSelection();
    setRoomForm(newRoomForm());
    await loadData();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to save room type.",
    );
  } finally {
    setSaving(false);
    setBusyAction("");
  }
}
  async function deleteRoom(room: RoomRecord) {
    clearFeedback();

    if (!(await confirm({
      title: "Delete room type?",
      message: `Delete the "${room.name}" room type? Existing reservations may prevent deletion.`,
      confirmLabel: "Delete room type",
      destructive: true,
    }))) {
      return;
    }

    setBusyAction("Deleting room type...");
    setSaving(true);

    try {
      await adminRequest(
        `/rooms/${encodeURIComponent(room.id)}`,
        "DELETE",
      );

      if (roomForm.id === room.id) {
        clearRoomPhotoSelection();
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
      setBusyAction("");
    }
  }
  async function saveRoomTypeOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const name = roomTypeOptionName.trim();
    if (!name) {
      setError("Enter a room type name.");
      return;
    }

    const optionAction = editingRoomTypeOptionId ? "Rename" : "Add";
    if (!(await confirm({
      title: `${optionAction} room type option?`,
      message: `Are you sure you want to ${optionAction.toLowerCase()} room type option "${name}"?`,
      confirmLabel: editingRoomTypeOptionId ? "Save changes" : "Add option",
    }))) return;

    setBusyAction(editingRoomTypeOptionId ? "Saving room type option..." : "Adding room type option...");
    setSaving(true);
    try {
      if (editingRoomTypeOptionId) {
        await adminRequest(
          `/room-type-options/${encodeURIComponent(editingRoomTypeOptionId)}`,
          "PUT",
          { name },
        );
        setMessage("Room type option renamed successfully.");
      } else {
        await adminRequest("/room-type-options", "POST", { name });
        setMessage("Room type option added successfully.");
      }

      setRoomTypeOptionName("");
      setEditingRoomTypeOptionId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save room type option.");
    } finally {
      setSaving(false);
      setBusyAction("");
    }
  }

  async function toggleRoomTypeOption(option: RoomTypeOptionRecord) {
    clearFeedback();
    const nextState = option.isActive ? "deactivate" : "activate";
    if (!(await confirm({
      title: `${nextState[0].toUpperCase()}${nextState.slice(1)} room type option?`,
      message: `Are you sure you want to ${nextState} "${option.name}"?`,
      confirmLabel: nextState[0].toUpperCase() + nextState.slice(1),
    }))) {
      return;
    }

    setBusyAction(
      `${option.isActive ? "Deactivating" : "Activating"} room type option...`,
    );
    setSaving(true);

    try {
      await adminRequest(
        `/room-type-options/${encodeURIComponent(option.id)}/active`,
        "PATCH",
        { isActive: !option.isActive },
      );
      setMessage(
        option.isActive
          ? "Room type option deactivated."
          : "Room type option activated.",
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update room type option.");
    } finally {
      setSaving(false);
      setBusyAction("");
    }
  }

  async function saveAmenity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const name = amenityName.trim();
    if (!name) {
      setError("Enter an amenity name.");
      return;
    }

    const amenityAction = editingAmenityId ? "Rename" : "Add";
    if (!(await confirm({
      title: `${amenityAction} amenity?`,
      message: `Are you sure you want to ${amenityAction.toLowerCase()} amenity "${name}"?`,
      confirmLabel: editingAmenityId ? "Save changes" : "Add amenity",
    }))) return;

    setBusyAction(editingAmenityId ? "Saving amenity changes..." : "Adding amenity...");
    setSaving(true);
    try {
      if (editingAmenityId) {
        await adminRequest(
          `/amenities/${encodeURIComponent(editingAmenityId)}`,
          "PUT",
          { name },
        );
        setMessage("Amenity renamed successfully.");
      } else {
        await adminRequest("/amenities", "POST", { name });
        setMessage("Amenity added successfully.");
      }

      setAmenityName("");
      setEditingAmenityId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save amenity.");
    } finally {
      setSaving(false);
      setBusyAction("");
    }
  }

  async function deleteAmenity(amenity: AmenityRecord) {
    clearFeedback();

    const branchCount = amenity._count?.branches ?? 0;
    const roomCount = amenity._count?.roomTypes ?? 0;

    if (branchCount > 0 || roomCount > 0) {
      setError("This amenity is assigned to a branch or room type and cannot be deleted.");
      return;
    }

    if (!(await confirm({
      title: "Delete amenity?",
      message: `Are you sure you want to delete the "${amenity.name}" amenity?`,
      confirmLabel: "Delete amenity",
      destructive: true,
    }))) return;

    setBusyAction("Deleting amenity...");
    setSaving(true);
    try {
      await adminRequest(
        `/amenities/${encodeURIComponent(amenity.id)}`,
        "DELETE",
      );
      setMessage("Amenity deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete amenity.");
    } finally {
      setSaving(false);
      setBusyAction("");
    }
  }
  return (
    <section
      id="admin-accommodation"
      className="admin-accommodation"
      aria-busy={loading || saving}
    >
      <div className="admin-accommodation-heading">
        <div>
          <p className="admin-eyebrow">PROPERTY MANAGEMENT</p>
          <h2>{section === "branches" ? "Branch Management" : "Room Management"}</h2>
          <p>
            {section === "branches"
              ? "Manage The Grand Aurelia branches and their details."
              : "Manage room type options, amenities, and rooms at each branch."}
          </p>
        </div>

        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => {
            setLoading(true);
            setError("");
            setBusyAction("Refreshing accommodation...");
            void loadData().finally(() => setBusyAction(""));
          }}
          disabled={loading || saving}
        >
          {loading && busyAction === "Refreshing accommodation..."
            ? "Refreshing..."
            : "Refresh accommodation"}
        </button>
      </div>

      {(loading || saving) && (
        <p className="admin-feedback" role="status" aria-live="polite">
          {busyAction || "Loading accommodation..."}
        </p>
      )}

      <ToastMessage message={error} />

      {message && (
        <p className="admin-feedback admin-feedback-success" role="status">
          {message}
        </p>
      )}
      {section === "rooms" && (
        <>
            <div className="admin-form-card">
        <h3>Room type options</h3>
        <p>Manage the room types available when creating or editing rooms.</p>

        <form onSubmit={saveRoomTypeOption}>
          <div className="admin-form-grid">
            <label>
              Room type name *
              <input
                value={roomTypeOptionName}
                onChange={(event) => setRoomTypeOptionName(event.target.value)}
                placeholder="e.g. Deluxe Suite"
                required
              />
            </label>
                                 </div>

                        <div style={{ marginTop: 16 }}>
                          <h5>Room amenities</h5>
                          <p>Select the facilities available in this room type.</p>

                          {amenities.length === 0 ? (
                            <p>No amenities have been added to the catalogue yet.</p>
                          ) : (
                            <div className="admin-form-grid">
                              {amenities.map((amenity) => (
                                <label
                                  key={amenity.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={roomForm.amenityIds.includes(amenity.id)}
                                    onChange={(event) =>
                                      setRoomForm((current) => ({
                                        ...current,
                                        amenityIds: event.target.checked
                                          ? [...current.amenityIds, amenity.id]
                                          : current.amenityIds.filter(
                                              (id) => id !== amenity.id,
                                            ),
                                      }))
                                    }
                                  />
                                  {amenity.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="admin-form-actions">
            <button type="submit" disabled={saving}>
              {saving && busyAction.includes("room type option")
                ? busyAction
                : editingRoomTypeOptionId
                  ? "Save name"
                  : "Add room type option"}
            </button>
            {editingRoomTypeOptionId && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => {
                  setRoomTypeOptionName("");
                  setEditingRoomTypeOptionId(null);
                }}
                disabled={saving}
              >
                Cancel editing
              </button>
            )}
          </div>
        </form>

        <div className="admin-room-list">
          {roomTypeOptions.length === 0 ? (
            <p>No room type options have been added.</p>
          ) : (
            roomTypeOptions.map((option) => (
              <div className="admin-room-row" key={option.id}>
                <div>
                  <strong>{option.name}</strong>
                  <p>{option.isActive ? "Active" : "Inactive"}</p>
                </div>
                <div className="admin-inline-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => {
                      setEditingRoomTypeOptionId(option.id);
                      setRoomTypeOptionName(option.name);
                    }}
                    disabled={saving}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => void toggleRoomTypeOption(option)}
                    disabled={saving}
                  >
                    {saving && busyAction.includes("room type option")
                      ? busyAction
                      : option.isActive
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-form-card">
        <h3>Amenity catalogue</h3>
        <p>
          Manage facilities that can be assigned to branches and room types.
          Amenities already in use cannot be deleted.
        </p>

        <form onSubmit={saveAmenity}>
          <div className="admin-form-grid">
            <label>
              Amenity name *
              <input
                value={amenityName}
                onChange={(event) => setAmenityName(event.target.value)}
                placeholder="e.g. Wi-Fi"
                required
              />
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="submit" disabled={saving}>
              {saving && busyAction.includes("amenity")
                ? busyAction
                : editingAmenityId
                  ? "Save name"
                  : "Add amenity"}
            </button>
            {editingAmenityId && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => {
                  setAmenityName("");
                  setEditingAmenityId(null);
                }}
                disabled={saving}
              >
                Cancel editing
              </button>
            )}
          </div>
        </form>

        <div className="admin-room-list">
          {amenities.length === 0 ? (
            <p>No amenities have been added.</p>
          ) : (
            amenities.map((amenity) => (
              <div className="admin-room-row" key={amenity.id}>
                <div>
                  <strong>{amenity.name}</strong>
                  <p>
                    Used by {amenity._count?.branches ?? 0} branch(es) and{" "}
                    {amenity._count?.roomTypes ?? 0} room type(s)
                  </p>
                </div>
                <div className="admin-inline-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => {
                      setEditingAmenityId(amenity.id);
                      setAmenityName(amenity.name);
                    }}
                    disabled={saving}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="admin-danger-button"
                    onClick={() => void deleteAmenity(amenity)}
                    disabled={
                      saving ||
                      (amenity._count?.branches ?? 0) > 0 ||
                      (amenity._count?.roomTypes ?? 0) > 0
                    }
                  >
                    {saving && busyAction === "Deleting amenity..."
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      )}


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
                 <h3>The Grand Aurelia</h3>
                  {section === "branches" && (
                    <>
                      <p>{hotel.description || "No description provided."}</p>
                      <small>{hotel.branches.length} branch(es)</small>
                    </>
                  )}
                </div>

              </div>

              <div className="admin-branch-list">
                {section === "branches" ? (
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
                ) : (
                  <div className="admin-subheading">
                    <h4>Rooms by branch</h4>
                  </div>
                )}

                {section === "branches" && branchForm.hotelId === hotel.id && (
                  <form
                    ref={branchFormRef}
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
                                  onClick={async () => {
                                    if (await confirm({
                                      title: "Remove branch photo?",
                                      message: "Remove this photo from the branch?",
                                      confirmLabel: "Remove photo",
                                      destructive: true,
                                    })) {
                                      removeExistingBranchImage(photoUrl);
                                    }
                                  }} disabled={saving}>Remove</button>
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
                                  onClick={async () => {
                                    if (await confirm({
                                      title: "Remove uploaded photo?",
                                      message: "Remove this photo from the upload list?",
                                      confirmLabel: "Remove photo",
                                      destructive: true,
                                    })) {
                                      removePendingBranchPhoto(index);
                                    }
                                  }} disabled={saving}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p style={{ marginTop: 10 }}>No branch photos selected.</p>}
                    </div>

                    <div className="admin-form-actions">
                      <button type="submit" disabled={saving}>
                        {saving && busyAction.toLowerCase().includes("branch")
                          ? busyAction
                          : branchForm.id
                            ? "Save branch"
                            : "Create branch"}
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
                       {section === "branches" && <div className="admin-inline-actions">
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
                          {saving && busyAction === "Deleting branch..."
                            ? "Deleting..."
                            : "Delete branch"}
                        </button>
                      </div>}
                    </div>

                    {section === "branches" && branch.coverImage && (
                      <img src={getBranchPhotoUrl(branch.coverImage)} alt={`${branch.name} cover`}
                        style={{ width: "100%", maxWidth: 320, height: 150, objectFit: "cover", borderRadius: 8, margin: "12px 0" }} />
                    )}

                    {section === "rooms" && (
                    <>
                    <div className="admin-subheading">
                      <h5>Room types</h5>
                      <button
                        type="button"
                        onClick={() =>
                          startNewRoom(branch.id)
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
  Room type *
  <select
    value={roomForm.roomTypeOptionId}
    onChange={(event) =>
      setRoomForm({
        ...roomForm,
        roomTypeOptionId: event.target.value,
      })
    }
    required
  >
    <option value="">Select a room type</option>
    {roomTypeOptions
      .filter(
        (option) =>
          option.isActive ||
          option.id === roomForm.roomTypeOptionId,
      )
      .map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
          {!option.isActive ? " (Inactive)" : ""}
        </option>
      ))}
  </select>
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
                        <div className="admin-room-photo-upload">
                          <strong>Room photos</strong>
                          <p>
                            Add up to 8 JPG, PNG or WEBP photos, 5 MB each.
                          </p>
                          <label>
                            Add photos
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              onChange={handleRoomPhotoSelection}
                              disabled={
                                saving ||
                                existingRoomImages.length +
                                  pendingRoomPhotos.length >=
                                  8
                              }
                            />
                          </label>
                          {(existingRoomImages.length > 0 ||
                            pendingRoomPhotos.length > 0) && (
                            <div className="admin-room-photo-list">
                              {existingRoomImages.map((photo) => (
                                <div key={photo}>
                                  <img
                                    src={getBranchPhotoUrl(photo)}
                                    alt="Room"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeExistingRoomImage(photo)
                                    }
                                    disabled={saving}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              {pendingRoomPhotos.map((photo, index) => (
                                <div key={photo.previewUrl}>
                                  <img src={photo.previewUrl} alt="Room" />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removePendingRoomPhoto(index)
                                    }
                                    disabled={saving}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                         <div className="admin-form-actions">
                          <button type="submit" disabled={saving}>
                            {saving && busyAction.toLowerCase().includes("room type")
                              ? busyAction
                              : roomForm.id
                                ? "Save room type"
                                : "Create room type"}
                          </button>
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => {
                              clearRoomPhotoSelection();
                              setRoomForm(newRoomForm());
                            }}
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
                                onClick={() => editRoom(room, branch.id)}
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
                                {saving && busyAction === "Deleting room type..."
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    </>
                    )}
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {dialog}
    </section>
  );
}

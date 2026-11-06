import { API_BASE_URL } from "../api";
import type { Branch } from "../types/hotel";

export function getBranchPhotos(branch: Branch): string[] {
  const photos = branch.images ?? [];

  if (branch.coverImage) {
    return [
      branch.coverImage,
      ...photos.filter((photo) => photo !== branch.coverImage),
    ];
  }

  return photos;
}

export function getBranchPhotoUrl(photoPath: string): string {
  if (/^https?:\/\//i.test(photoPath)) {
    return photoPath;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/v1$/, "");

  return `${apiOrigin}${photoPath.startsWith("/") ? "" : "/"}${photoPath}`;
}

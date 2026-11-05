import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Express } from "express";

const BRANCH_PHOTO_DIRECTORY = join(
  process.cwd(),
  "uploads",
  "branches",
);

const BRANCH_PHOTO_URL_PREFIX = "/uploads/branches/";

function getValidatedImageExtension(
  file: Express.Multer.File,
): string {
  const buffer = file.buffer;

  if (!buffer || buffer.length < 12) {
    throw new Error("An uploaded photo is empty or invalid.");
  }

  let detectedExtension: string | null = null;

  // JPEG signature
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedExtension = ".jpg";
  }

  // PNG signature
  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    detectedExtension = ".png";
  }

  // WEBP signature
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    detectedExtension = ".webp";
  }

  const expectedExtensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  if (
    !detectedExtension ||
    expectedExtensions[file.mimetype] !== detectedExtension
  ) {
    throw new Error(
      "Invalid image file. Upload a genuine JPG, PNG or WEBP image.",
    );
  }

  return detectedExtension;
}

function getManagedPhotoPath(photoUrl: string): string | null {
  if (!photoUrl.startsWith(BRANCH_PHOTO_URL_PREFIX)) {
    return null;
  }

  const filename = photoUrl.slice(BRANCH_PHOTO_URL_PREFIX.length);

  if (!filename || basename(filename) !== filename) {
    return null;
  }

  return join(BRANCH_PHOTO_DIRECTORY, filename);
}

export async function saveBranchPhotos(
  files: Express.Multer.File[],
): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  // Validate every file before writing any of them.
  const extensions = files.map(getValidatedImageExtension);

  await mkdir(BRANCH_PHOTO_DIRECTORY, { recursive: true });

  const savedUrls: string[] = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const filename = `${randomUUID()}${extensions[index]}`;
      const filePath = join(BRANCH_PHOTO_DIRECTORY, filename);

      await writeFile(filePath, files[index].buffer, {
        flag: "wx",
      });

      savedUrls.push(`${BRANCH_PHOTO_URL_PREFIX}${filename}`);
    }

    return savedUrls;
  } catch (error) {
    // Remove newly written files if any later write fails.
    await removeBranchPhotos(savedUrls);
    throw error;
  }
}

export async function removeBranchPhotos(
  photoUrls: string[],
): Promise<void> {
  for (const photoUrl of photoUrls) {
    const filePath = getManagedPhotoPath(photoUrl);

    if (!filePath) {
      continue;
    }

    try {
      await unlink(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== "ENOENT") {
        console.error("Could not remove branch photo:", error);
      }
    }
  }
}
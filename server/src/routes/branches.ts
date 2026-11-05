
import { Router, type Request } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { uploadBranchPhotos } from "../middleware/branch-upload.js";
import {
  saveBranchPhotos,
  removeBranchPhotos,
} from "../lib/branch-photo-storage.js";

const router = Router();

const MAX_BRANCH_PHOTOS = 8;

class BranchRequestError extends Error {}

function getUploadedFiles(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}

function parseExistingImages(
  value: unknown,
  currentImages: string[],
): string[] {
  if (value === undefined) {
    return [...currentImages];
  }

  let parsed: unknown = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BranchRequestError(
        "Existing photos must be provided as a valid JSON array.",
      );
    }
  }

  if (
    !Array.isArray(parsed) ||
    parsed.some((image) => typeof image !== "string")
  ) {
    throw new BranchRequestError(
      "Existing photos must be provided as a valid JSON array.",
    );
  }

  const images = [...new Set(parsed as string[])];

  if (images.some((image) => !currentImages.includes(image))) {
    throw new BranchRequestError(
      "One or more selected photos do not belong to this branch.",
    );
  }

  return images;
}

function resolveCoverImage(
  value: unknown,
  images: string[],
  uploadedUrls: string[],
  fallback: string | null,
): string | null {
  if (value === undefined) {
    return fallback && images.includes(fallback)
      ? fallback
      : images[0] ?? null;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new BranchRequestError("Invalid cover photo selection.");
  }

  const newPhotoMatch = /^new:(\d+)$/.exec(value);

  if (newPhotoMatch) {
    const selectedPhoto = uploadedUrls[Number(newPhotoMatch[1])];

    if (!selectedPhoto || !images.includes(selectedPhoto)) {
      throw new BranchRequestError(
        "The selected new cover photo does not exist.",
      );
    }

    return selectedPhoto;
  }

  if (!images.includes(value)) {
    throw new BranchRequestError(
      "The selected cover photo is not part of this branch gallery.",
    );
  }

  return value;
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

function isInvalidUploadedPhoto(error: unknown): boolean {
  return (
    error instanceof Error &&
    (
      error.message.startsWith("Invalid image file") ||
      error.message.startsWith("An uploaded photo")
    )
  );
}

// GET /api/v1/branches/hotel/:hotelId
router.get("/hotel/:hotelId", async (req, res) => {
  try {
    const branches = await prisma.hotelBranch.findMany({
      where: { hotelId: req.params.hotelId },
      include: {
        roomTypes: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    console.error("Failed to fetch hotel branches:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch hotel branches",
    });
  }
});

// POST /api/v1/branches
router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadBranchPhotos,
  async (req, res) => {
    let savedPhotos: string[] = [];

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;

      const { name, address, city, country, hotelId } = body;

      if (
        typeof name !== "string" || !name.trim() ||
        typeof address !== "string" || !address.trim() ||
        typeof city !== "string" || !city.trim() ||
        typeof country !== "string" || !country.trim() ||
        typeof hotelId !== "string" || !hotelId.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            "Name, address, city, country, and hotelId are required.",
        });
        return;
      }

      const files = getUploadedFiles(req);

      savedPhotos = await saveBranchPhotos(files);

      const coverImage = resolveCoverImage(
        body.coverImage,
        savedPhotos,
        savedPhotos,
        null,
      );

      const branch = await prisma.hotelBranch.create({
        data: {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          country: country.trim(),
          hotelId: hotelId.trim(),
          images: savedPhotos,
          coverImage,
        },
      });

      res.status(201).json({
        success: true,
        data: branch,
      });
    } catch (error) {
      await removeBranchPhotos(savedPhotos);

      if (
        error instanceof BranchRequestError ||
        isInvalidUploadedPhoto(error)
      ) {
        res.status(400).json({
          success: false,
          message:
  error instanceof Error
    ? error.message
    : "Invalid branch request.",
        });
        return;
      }

      if (getPrismaErrorCode(error) === "P2003") {
        res.status(400).json({
          success: false,
          message: "The selected hotel does not exist.",
        });
        return;
      }

      console.error("Failed to create hotel branch:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create hotel branch",
      });
    }
  },
);

// PUT /api/v1/branches/:id
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadBranchPhotos,
  async (req, res) => {
    const branchId = req.params.id;

    if (typeof branchId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
      return;
    }

    let savedPhotos: string[] = [];

    try {
      const branch = await prisma.hotelBranch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        res.status(404).json({
          success: false,
          message: "Hotel branch not found",
        });
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;

      const {
        name,
        address,
        city,
        country,
        phone,
        checkInTime,
        checkOutTime,
        cancellationPolicy,
      } = body;

      const data: {
        name?: string;
        address?: string;
        city?: string;
        country?: string;
        phone?: string | null;
        checkInTime?: string | null;
        checkOutTime?: string | null;
        cancellationPolicy?: string | null;
        images?: string[];
        coverImage?: string | null;
      } = {};

      for (const [field, value] of Object.entries({
        name,
        address,
        city,
        country,
      })) {
        if (value !== undefined) {
          if (typeof value !== "string" || !value.trim()) {
            res.status(400).json({
              success: false,
              message: `${field} must be a non-empty string`,
            });
            return;
          }

          data[field as "name" | "address" | "city" | "country"] =
            value.trim();
        }
      }

      for (const [field, value] of Object.entries({
        phone,
        checkInTime,
        checkOutTime,
        cancellationPolicy,
      })) {
        if (value !== undefined) {
          if (value !== null && typeof value !== "string") {
            res.status(400).json({
              success: false,
              message: `${field} must be a string or null`,
            });
            return;
          }

          data[
            field as
              | "phone"
              | "checkInTime"
              | "checkOutTime"
              | "cancellationPolicy"
          ] = value === null ? null : value.trim();
        }
      }

      const files = getUploadedFiles(req);

      const imagePayloadProvided =
        body.existingImages !== undefined || files.length > 0;

      let finalImages = [...branch.images];

      if (imagePayloadProvided) {
        const retainedImages = parseExistingImages(
          body.existingImages,
          branch.images,
        );

        if (retainedImages.length + files.length > MAX_BRANCH_PHOTOS) {
          throw new BranchRequestError(
            `A branch can have a maximum of ${MAX_BRANCH_PHOTOS} photos.`,
          );
        }

        savedPhotos = await saveBranchPhotos(files);

        finalImages = [...retainedImages, ...savedPhotos];

        data.images = finalImages;
      }

      if (
        body.coverImage !== undefined ||
        imagePayloadProvided
      ) {
        data.coverImage = resolveCoverImage(
          body.coverImage,
          finalImages,
          savedPhotos,
          branch.coverImage,
        );
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          success: false,
          message: "Provide at least one valid field to update",
        });
        return;
      }

      const updatedBranch = await prisma.hotelBranch.update({
        where: { id: branchId },
        data,
      });

      // Delete old photos only after the database update succeeds.
      const removedPhotos = branch.images.filter(
        (image) => !updatedBranch.images.includes(image),
      );

      await removeBranchPhotos(removedPhotos);

      res.status(200).json({
        success: true,
        data: updatedBranch,
      });
    } catch (error) {
      // If the database update failed, remove only the newly uploaded files.
      await removeBranchPhotos(savedPhotos);

      if (
        error instanceof BranchRequestError ||
        isInvalidUploadedPhoto(error)
      ) {
        res.status(400).json({
          success: false,
          message:
  error instanceof Error
    ? error.message
    : "Invalid branch request.",
        });
        return;
      }

      if (getPrismaErrorCode(error) === "P2025") {
        res.status(404).json({
          success: false,
          message: "Hotel branch not found",
        });
        return;
      }

      console.error("Failed to update hotel branch:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update hotel branch",
      });
    }
  },
);

// DELETE /api/v1/branches/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const branchId = req.params.id;

  if (typeof branchId !== "string") {
    res.status(400).json({
      success: false,
      message: "Invalid branch ID",
    });
    return;
  }

  try {
    const branch = await prisma.hotelBranch.delete({
      where: { id: branchId },
    });

    await removeBranchPhotos(branch.images);

    res.status(200).json({
      success: true,
      message: "Hotel branch deleted successfully",
      data: branch,
    });
  } catch (error) {
    if (getPrismaErrorCode(error) === "P2025") {
      res.status(404).json({
        success: false,
        message: "Hotel branch not found",
      });
      return;
    }

    if (getPrismaErrorCode(error) === "P2003") {
      res.status(409).json({
        success: false,
        message:
          "This branch cannot be deleted because it is linked to existing records.",
      });
      return;
    }

    console.error("Failed to delete hotel branch:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete hotel branch",
    });
  }
});

export default router;

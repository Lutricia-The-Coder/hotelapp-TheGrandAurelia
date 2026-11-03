import multer from "multer";
import type { RequestHandler } from "express";

const MAX_BRANCH_PHOTOS = 8;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB per photo

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const INVALID_IMAGE_TYPE_MESSAGE =
  "Only JPG, PNG and WEBP images are allowed.";

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_PHOTO_SIZE,
    files: MAX_BRANCH_PHOTOS,
    fields: 16,
    fieldSize: 64 * 1024,
    parts: 24,
  },

  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error(INVALID_IMAGE_TYPE_MESSAGE));
      return;
    }

    callback(null, true);
  },
});

export const uploadBranchPhotos: RequestHandler = (
  req,
  res,
  next,
) => {
  upload.array("photos", MAX_BRANCH_PHOTOS)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      let message = "The photo upload failed.";

      if (error.code === "LIMIT_FILE_SIZE") {
        message = "Each photo must be 5 MB or smaller.";
      } else if (
        error.code === "LIMIT_FILE_COUNT" ||
        error.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        message = `You can upload a maximum of ${MAX_BRANCH_PHOTOS} photos.`;
      }

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (
      error instanceof Error &&
      error.message === INVALID_IMAGE_TYPE_MESSAGE
    ) {
      res.status(400).json({
        success: false,
        message: INVALID_IMAGE_TYPE_MESSAGE,
      });

      return;
    }

    next(error);
  });
};
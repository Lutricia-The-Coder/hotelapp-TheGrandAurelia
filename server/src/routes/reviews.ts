
import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

// GET /api/v1/reviews/branch/:branchId
// Public: view reviews for a branch.
router.get("/branch/:branchId", async (req, res) => {
  try {
    const branchId = req.params.branchId;

    if (typeof branchId !== "string" || !isUuid(branchId)) {
      res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
      return;
    }

    const branch = await prisma.hotelBranch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { branchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : null;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      data: reviews,
    });
  } catch (error) {
    console.error("Failed to load branch reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load branch reviews.",
    });
  }
});

// GET /api/v1/reviews/hotel/:hotelId
// Public: view all reviews associated with a hotel (used by the admin view).
router.get("/hotel/:hotelId", async (req, res) => {
  try {
    const hotelId = req.params.hotelId;

    if (typeof hotelId !== "string" || !isUuid(hotelId)) {
      res.status(400).json({
        success: false,
        message: "Invalid hotel ID.",
      });
      return;
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true },
    });

    if (!hotel) {
      res.status(404).json({
        success: false,
        message: "Hotel not found.",
      });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { hotelId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : null;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      data: reviews,
    });
  } catch (error) {
    console.error("Failed to load reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load reviews.",
    });
  }
});

// POST /api/v1/reviews/branch/:branchId
// Authenticated: create or update the current user's review for a branch.
router.post(
  "/branch/:branchId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = req.params.branchId;
      const { rating, comment } = req.body ?? {};

      if (typeof branchId !== "string" || !isUuid(branchId)) {
        res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
        return;
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: "Rating must be a whole number from 1 to 5.",
        });
        return;
      }

      if (
        comment !== undefined &&
        comment !== null &&
        (typeof comment !== "string" || comment.length > 2000)
      ) {
        res.status(400).json({
          success: false,
          message: "Comment must be text of no more than 2000 characters.",
        });
        return;
      }

      const branch = await prisma.hotelBranch.findUnique({
        where: { id: branchId },
        select: { id: true, hotelId: true },
      });

      if (!branch) {
        res.status(404).json({
          success: false,
          message: "Branch not found.",
        });
        return;
      }

      const normalizedComment =
        typeof comment === "string" ? comment.trim() || null : null;

      const review = await prisma.review.upsert({
        where: {
          userId_branchId: {
            userId: req.user!.id,
            branchId,
          },
        },
        update: {
          rating,
          comment: normalizedComment,
        },
        create: {
          userId: req.user!.id,
          hotelId: branch.hotelId,
          branchId,
          rating,
          comment: normalizedComment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Review saved successfully.",
        data: review,
      });
    } catch (error) {
      console.error("Failed to save branch review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save branch review.",
      });
    }
  },
);

export default router;

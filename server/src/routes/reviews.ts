
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

// GET /api/v1/reviews/hotel/:hotelId
// Public: view reviews for a hotel.
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

// POST /api/v1/reviews/hotel/:hotelId
// Authenticated: create or update the current user's review.
router.post(
  "/hotel/:hotelId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const hotelId = req.params.hotelId;
      const { rating, comment } = req.body ?? {};

      if (typeof hotelId !== "string" || !isUuid(hotelId)) {
        res.status(400).json({
          success: false,
          message: "Invalid hotel ID.",
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

      const normalizedComment =
        typeof comment === "string" ? comment.trim() || null : null;

      const review = await prisma.review.upsert({
        where: {
          userId_hotelId: {
            userId: req.user!.id,
            hotelId,
          },
        },
        update: {
          rating,
          comment: normalizedComment,
        },
        create: {
          userId: req.user!.id,
          hotelId,
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
      console.error("Failed to save review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save review.",
      });
    }
  },
);

export default router;


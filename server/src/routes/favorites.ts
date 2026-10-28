
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

// GET /api/v1/favorites
// Return the signed-in user's saved hotels.
router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user!.id },
        include: {
          hotel: {
            include: {
              images: {
                orderBy: { sortOrder: "asc" },
              },
              branches: {
                include: {
                  roomTypes: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({
        success: true,
        count: favorites.length,
        data: favorites,
      });
    } catch (error) {
      console.error("Failed to load favorites:", error);
      res.status(500).json({
        success: false,
        message: "Failed to load favorites.",
      });
    }
  },
);

// POST /api/v1/favorites/:hotelId
// Save a hotel to the signed-in user's favorites.
router.post(
  "/:hotelId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
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

      const favorite = await prisma.favorite.upsert({
        where: {
          userId_hotelId: {
            userId: req.user!.id,
            hotelId,
          },
        },
        update: {},
        create: {
          userId: req.user!.id,
          hotelId,
        },
        include: {
          hotel: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Hotel added to favorites.",
        data: favorite,
      });
    } catch (error) {
      console.error("Failed to add favorite:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add hotel to favorites.",
      });
    }
  },
);

// DELETE /api/v1/favorites/:hotelId
// Remove a hotel from the signed-in user's favorites.
router.delete(
  "/:hotelId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const hotelId = req.params.hotelId;

      if (typeof hotelId !== "string" || !isUuid(hotelId)) {
        res.status(400).json({
          success: false,
          message: "Invalid hotel ID.",
        });
        return;
      }

      await prisma.favorite.deleteMany({
        where: {
          userId: req.user!.id,
          hotelId,
        },
      });

      res.status(200).json({
        success: true,
        message: "Hotel removed from favorites.",
      });
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove hotel from favorites.",
      });
    }
  },
);

export default router;

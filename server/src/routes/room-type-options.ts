
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/room-type-options
// Public: guests and admins can view active options.
router.get("/", async (_req, res) => {
  try {
    const options = await prisma.roomTypeOption.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      count: options.length,
      data: options,
    });
  } catch (error) {
    console.error("Failed to fetch room type options:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room type options",
    });
  }
});

// GET /api/v1/room-type-options/admin
// Admin: view active and inactive options.
router.get("/admin", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const options = await prisma.roomTypeOption.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    res.status(200).json({
      success: true,
      count: options.length,
      data: options,
    });
  } catch (error) {
    console.error("Failed to fetch all room type options:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room type options",
    });
  }
});

// POST /api/v1/room-type-options
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "A room type name is required",
      });
      return;
    }

    const option = await prisma.roomTypeOption.create({
      data: { name: name.trim() },
    });

    res.status(201).json({
      success: true,
      data: option,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "That room type option already exists",
      });
      return;
    }

    console.error("Failed to create room type option:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create room type option",
    });
  }
});

// PUT /api/v1/room-type-options/:id
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const optionId = req.params.id;

  if (typeof optionId !== "string") {
    res.status(400).json({
      success: false,
      message: "Invalid room type option ID",
    });
    return;
  }

  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "A valid room type name is required",
      });
      return;
    }

    const option = await prisma.roomTypeOption.update({
      where: { id: optionId },
      data: { name: name.trim() },
    });

    res.status(200).json({
      success: true,
      data: option,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "That room type option already exists",
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      res.status(404).json({
        success: false,
        message: "Room type option not found",
      });
      return;
    }

    console.error("Failed to update room type option:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update room type option",
    });
  }
});

// PATCH /api/v1/room-type-options/:id/active
// Deactivate instead of deleting options already used by rooms.
router.patch(
  "/:id/active",
  requireAuth,
  requireAdmin,
    async (req, res) => {
    const optionId = req.params.id;

    if (typeof optionId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid room type option ID",
      });
      return;
    }

    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
        return;
      }

      const option = await prisma.roomTypeOption.update({
        where: { id: optionId },
        data: { isActive },
      });

      res.status(200).json({
        success: true,
        data: option,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          message: "Room type option not found",
        });
        return;
      }

      console.error("Failed to change room type option status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to change room type option status",
      });
    }
  },
);

export default router;

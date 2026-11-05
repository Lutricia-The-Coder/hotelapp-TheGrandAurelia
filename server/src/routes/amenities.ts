import { Router, type Request } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public: list amenities for guest-facing room filters.
router.get("/", async (_req, res) => {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      data: amenities,
    });
  } catch (error) {
    console.error("Failed to fetch amenities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch amenities",
    });
  }
});

// Admin: list the amenity catalogue.
router.get("/admin", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            branches: true,
            roomTypes: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: amenities,
    });
  } catch (error) {
    console.error("Failed to fetch admin amenities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch amenities",
    });
  }
});

// Admin: create an amenity.
router.post("/", requireAuth, requireAdmin, async (req: Request, res) => {
  try {
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Amenity name is required",
      });
      return;
    }

    const amenity = await prisma.amenity.create({
      data: { name },
    });

    res.status(201).json({
      success: true,
      data: amenity,
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
        message: "An amenity with this name already exists",
      });
      return;
    }

    console.error("Failed to create amenity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create amenity",
    });
  }
});

// Admin: rename an amenity.
router.put("/:id", requireAuth, requireAdmin, async (req: Request, res) => {
  try {
    const amenityId =
  typeof req.params.id === "string"
    ? req.params.id
    : req.params.id?.[0];

if (!amenityId) {
  res.status(400).json({
    success: false,
    message: "Amenity ID is required",
  });
  return;
}
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Amenity name is required",
      });
      return;
    }

    const amenity = await prisma.amenity.update({
      where: { id: amenityId },
      data: { name },
    });

    res.status(200).json({
      success: true,
      data: amenity,
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
        message: "An amenity with this name already exists",
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
        message: "Amenity not found",
      });
      return;
    }

    console.error("Failed to update amenity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update amenity",
    });
  }
});

// Admin: delete an amenity only when it is not assigned anywhere.
router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res) => {
  try {
    const amenityId =
  typeof req.params.id === "string"
    ? req.params.id
    : req.params.id?.[0];

if (!amenityId) {
  res.status(400).json({
    success: false,
    message: "Amenity ID is required",
  });
  return;
}
const amenity = await prisma.amenity.findUnique({
  where: { id: amenityId },
});

if (!amenity) {
  res.status(404).json({
    success: false,
    message: "Amenity not found",
  });
  return;
}

const [branchUsage, roomTypeUsage] = await Promise.all([
  prisma.branchAmenity.count({
    where: { amenityId },
  }),
  prisma.roomTypeAmenity.count({
    where: { amenityId },
  }),
]);

if (branchUsage > 0 || roomTypeUsage > 0) {
  res.status(409).json({
    success: false,
    message:
      "This amenity is assigned to a branch or room type and cannot be deleted",
  });
  return;
}

    await prisma.amenity.delete({
      where: { id: amenity.id },
    });

    res.status(200).json({
      success: true,
      message: "Amenity deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete amenity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete amenity",
    });
  }
});

export default router;

import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/v1/rooms/branch/:branchId
router.get("/branch/:branchId", async (req, res) => {
  try {
    const rooms = await prisma.roomType.findMany({
      where: { branchId: req.params.branchId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("Failed to fetch room types:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch room types",
    });
  }
});

export default router;

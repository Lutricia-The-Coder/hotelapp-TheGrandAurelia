
import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

const allowedTitles = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

// GET /api/v1/users/me
// Get the authenticated user's own profile.
router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
        return;
      }

      // Never send the password hash to the frontend.
      const { passwordHash, ...safeUser } = user;

      res.status(200).json({
        success: true,
        data: {
          ...safeUser,
          hasPassword: Boolean(passwordHash),
        },
      });
    } catch (error) {
      console.error("Failed to load user profile:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load your profile.",
      });
    }
  },
);

// PATCH /api/v1/users/me
// Update the authenticated user's own profile.
router.patch(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body;

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        res.status(400).json({
          success: false,
          message: "A valid profile update is required.",
        });
        return;
      }

      const updates: {
        name?: string | null;
        title?: string | null;
      } = {};

      if (Object.prototype.hasOwnProperty.call(body, "name")) {
        if (
          body.name !== null &&
          typeof body.name !== "string"
        ) {
          res.status(400).json({
            success: false,
            message: "Name must be text or null.",
          });
          return;
        }

        const name =
          typeof body.name === "string"
            ? body.name.trim()
            : null;

        if (
          name !== null &&
          (name.length < 2 || name.length > 100)
        ) {
          res.status(400).json({
            success: false,
            message: "Name must contain between 2 and 100 characters.",
          });
          return;
        }

        updates.name = name;
      }

      if (Object.prototype.hasOwnProperty.call(body, "title")) {
        if (
          body.title !== null &&
          (
            typeof body.title !== "string" ||
            !allowedTitles.includes(body.title)
          )
        ) {
          res.status(400).json({
            success: false,
            message: "Please select a valid title.",
          });
          return;
        }

        updates.title = body.title;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          message: "No valid profile fields were provided.",
        });
        return;
      }

     const updatedUser = await prisma.user.update({
  where: { id: req.user!.id },
  data: updates,
  select: {
    id: true,
    name: true,
    title: true,
    email: true,
    image: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: true,
  },
});

// This statement must be AFTER the Prisma update call.
const { passwordHash, ...safeUser } = updatedUser;

res.status(200).json({
  success: true,
  message: "Profile updated successfully.",
  data: {
    ...safeUser,
    hasPassword: Boolean(passwordHash),
  },
});
    } catch (error) {
      console.error("Failed to update user profile:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update your profile.",
      });
    }
  },
);

// PATCH /api/v1/users/me/password
// Change an existing password or set an initial password for a Google user.
router.patch(
  "/me/password",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        currentPassword,
        newPassword,
        confirmNewPassword,
      } = req.body ?? {};

      if (
        typeof newPassword !== "string" ||
        newPassword.length < 8 ||
        Buffer.byteLength(newPassword, "utf8") > 72
      ) {
        res.status(400).json({
          success: false,
          message:
            "Your new password must be at least 8 characters and no more than 72 bytes.",
        });
        return;
      }

      if (
        typeof confirmNewPassword !== "string" ||
        newPassword !== confirmNewPassword
      ) {
        res.status(400).json({
          success: false,
          message: "Your new passwords do not match.",
        });
        return;
      }

     const user = await prisma.user.findUnique({
  where: { id: req.user!.id },
  select: {
    id: true,
    passwordHash: true,
  },
});

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User account not found.",
        });
        return;
      }

      // Existing password accounts must verify their current password.
      // Google-only accounts can set their first password.
      if (user.passwordHash) {
        if (
          typeof currentPassword !== "string" ||
          !currentPassword
        ) {
          res.status(400).json({
            success: false,
            message: "Your current password is required.",
          });
          return;
        }

        const currentPasswordMatches = await bcrypt.compare(
          currentPassword,
          user.passwordHash,
        );

        if (!currentPasswordMatches) {
          res.status(401).json({
            success: false,
            message: "Your current password is incorrect.",
          });
          return;
        }

        const samePassword = await bcrypt.compare(
          newPassword,
          user.passwordHash,
        );

        if (samePassword) {
          res.status(400).json({
            success: false,
            message:
              "Your new password must be different from your current password.",
          });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

           await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      });

      res.status(200).json({
        success: true,
        message: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error("Failed to change password:", error);

      res.status(500).json({
        success: false,
        message: "Unable to change your password right now.",
      });
    }
  },
);

export default router;

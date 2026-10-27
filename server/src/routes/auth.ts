
import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { title ,name, email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      password.length < 8
    ) {
      res.status(400).json({
        error: "A valid email and a password of at least 8 characters are required.",
      });
      return;
    }

const allowedTitles = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

if (
  title !== undefined &&
  (typeof title !== "string" || !allowedTitles.includes(title))
) {
  res.status(400).json({ error: "Please select a valid title." });
  return;
}

if (name !== undefined && typeof name !== "string") {
  res.status(400).json({ error: "Name must be a string." });
  return;
}
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
   data: {
  title: typeof title === "string" ? title : null,
  name: typeof name === "string" ? name.trim() || null : null,
  email: normalizedEmail,
  passwordHash,
},
      select: {
        id: true,
        title: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Unable to create account right now." });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        error: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({
        error: "Invalid email or password.",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      res.status(401).json({
        error: "Invalid email or password.",
      });
      return;
    }

    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured.");
      res.status(500).json({
        error: "Login is temporarily unavailable.",
      });
      return;
    }

    const token = jwt.default.sign(
      { sub: user.id, role: user.role },
      secret,
      { expiresIn: "1h" },
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Unable to log in right now.",
    });
  }
});
export default router;

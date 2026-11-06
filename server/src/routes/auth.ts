import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import {
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
} from "../lib/password-policy.js";

const router = Router();

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_COOKIE_PATH = "/api/v1/auth/google";

function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim();

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error("Google OAuth configuration is incomplete.");
  }

  return {
    clientId,
    client: new OAuth2Client(
      clientId,
      clientSecret,
      callbackUrl,
    ),
  };
}


function getGoogleStateCookie(cookieHeader: string | undefined) {
  const entry = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_STATE_COOKIE}=`));

  return entry?.slice(GOOGLE_STATE_COOKIE.length + 1);
}


router.post(
  "/admin-setup",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const setupKey = process.env.ADMIN_SETUP_KEY;
      const suppliedKey = req.body?.setupKey;

      if (!setupKey || setupKey.length < 32) {
        res.status(503).json({
          success: false,
          message: "Administrator setup is not configured or is disabled.",
        });
        return;
      }

      if (typeof suppliedKey !== "string") {
        res.status(400).json({
          success: false,
          message: "A valid setup key is required.",
        });
        return;
      }

      const expected = Buffer.from(setupKey, "utf8");
      const supplied = Buffer.from(suppliedKey, "utf8");

      if (
        expected.length !== supplied.length ||
        !timingSafeEqual(expected, supplied)
      ) {
        res.status(403).json({
          success: false,
          message: "Invalid administrator setup key.",
        });
        return;
      }

      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const promoted = await prisma.$transaction(
        async (tx) => {
          const adminCount = await tx.user.count({
            where: { role: "ADMIN" },
          });

          if (adminCount > 0) {
            return false;
          }

          await tx.user.update({
            where: { id: userId },
            data: { role: "ADMIN" },
          });

          return true;
        },
        {
          isolationLevel: "Serializable",
        },
      );

      if (!promoted) {
        res.status(409).json({
          success: false,
          message: "Administrator setup has already been completed.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Your account is now an administrator. Please sign in again.",
      });
    } catch (error) {
      console.error("Administrator setup failed:", error);

      res.status(409).json({
        success: false,
        message: "Administrator setup could not be completed. It may already have been used.",
      });
    }
  },
);

router.post("/register", async (req, res) => {
  try {
    const { title ,name, email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim()
    ) {
      res.status(400).json({
        error: "A valid email and password are required.",
      });
      return;
    }

    if (!meetsPasswordPolicy(password)) {
      res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
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

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured.");
      res.status(500).json({
        error: "Login is temporarily unavailable.",
      });
      return;
    }

    const token = jwt.sign(
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

router.get("/google", (_req, res) => {
  try {
    const { client } = createGoogleOAuthClient();

    const state = randomBytes(32).toString("hex");

    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: GOOGLE_COOKIE_PATH,
    });

    const authorizationUrl = client.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
      state,
      prompt: "select_account",
    });

    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("Unable to start Google sign-in:", error);

    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/?google_error=configuration`,
    );
  }
});

router.get("/google/callback", async (req, res) => {
  const frontendUrl =
    process.env.FRONTEND_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:5173";

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: GOOGLE_COOKIE_PATH,
  };

  const fail = (reason: string) => {
    res.clearCookie(GOOGLE_STATE_COOKIE, cookieOptions);
    res.redirect(
      `${frontendUrl}/?google_error=${encodeURIComponent(reason)}`,
    );
  };

  try {
    if (typeof req.query.error === "string") {
      fail("access_denied");
      return;
    }

    const code = req.query.code;
    const returnedState = req.query.state;
    const savedState = getGoogleStateCookie(req.headers.cookie);

    if (
      typeof code !== "string" ||
      typeof returnedState !== "string" ||
      !savedState
    ) {
      fail("invalid_callback");
      return;
    }

    const expectedState = Buffer.from(savedState, "utf8");
    const actualState = Buffer.from(returnedState, "utf8");

    if (
      expectedState.length !== actualState.length ||
      !timingSafeEqual(expectedState, actualState)
    ) {
      fail("invalid_state");
      return;
    }

    // Clear the one-use state cookie after successful validation.
    res.clearCookie(GOOGLE_STATE_COOKIE, cookieOptions);

    const { client, clientId } = createGoogleOAuthClient();

    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new Error("Google did not return an ID token.");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const profile = ticket.getPayload();

    if (
      !profile?.sub ||
      !profile.email ||
      profile.email_verified !== true
    ) {
      throw new Error("Google account identity or email is not verified.");
    }

    const normalizedEmail = profile.email.trim().toLowerCase();

    // Google subject ID is the stable account identifier.
    let user = await prisma.user.findUnique({
      where: { googleId: profile.sub },
    });

    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        if (
          existingUser.googleId &&
          existingUser.googleId !== profile.sub
        ) {
          throw new Error(
            "This email is linked to a different Google account.",
          );
        }

        // Link the verified Google identity without changing
        // the existing user's password or role.
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: profile.sub,
            name: existingUser.name ?? profile.name ?? null,
            image: existingUser.image ?? profile.picture ?? null,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            googleId: profile.sub,
            name: profile.name ?? null,
            email: normalizedEmail,
            image: profile.picture ?? null,
            passwordHash: null,
            role: "GUEST",
          },
        });
      }
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    // Issue the same application JWT used by email/password login.
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "1h" },
    );

    const clientUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // The fragment is not included in HTTP requests or referrer headers.The frontend stores the token in sessionStorage and immediately
    // removes the fragment from the browser address bar.
    const hash = new URLSearchParams({
      google_token: token,
      google_user: JSON.stringify(clientUser),
    });

    res.redirect(`${frontendUrl}/#${hash.toString()}`);
  } catch (error) {
    console.error("Google sign-in callback failed:", error);
    fail("signin_failed");
  }
});

export default router;

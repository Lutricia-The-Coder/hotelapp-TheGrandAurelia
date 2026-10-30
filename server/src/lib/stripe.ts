
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }

  // Only allow test keys in this development integration.
const isTestKey =
  secretKey.startsWith("sk_test_") ||
  secretKey.startsWith("rk_test_") ||
  secretKey.startsWith("rkcs_test_");

if (!isTestKey) {
  throw new Error(
    "Only Stripe test API keys are allowed in this development environment.",
  );
}

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL?.trim();

  if (!url) {
    throw new Error("FRONTEND_URL is missing.");
  }

  return url.replace(/\/+$/, "");
}

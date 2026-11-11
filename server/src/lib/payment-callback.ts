const PRODUCTION_FRONTEND_URL =
  "https://hotelapp-the-grand-aurelia.vercel.app";

export function getPaymentCallbackUrl(
  configuredFrontendUrl: string | undefined,
  environment: string | undefined,
): string {
  const frontendUrl = configuredFrontendUrl?.trim().replace(/\/+$/, "");

  if (!frontendUrl) {
    if (environment === "production") {
      return `${PRODUCTION_FRONTEND_URL}/?payment=success`;
    }

    throw new Error("FRONTEND_URL is missing.");
  }

  const parsedUrl = new URL(frontendUrl);
  const isLoopback =
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname.endsWith(".localhost") ||
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "[::1]";

  if (environment === "production" && isLoopback) {
    console.warn(
      "FRONTEND_URL points to localhost in production; using the production frontend for Paystack callbacks.",
    );
    return `${PRODUCTION_FRONTEND_URL}/?payment=success`;
  }

  return `${frontendUrl}/?payment=success`;
}

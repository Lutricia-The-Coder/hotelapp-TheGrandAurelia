const PRODUCTION_FRONTEND_URL =
  "https://hotelapp-the-grand-aurelia.vercel.app";
const PRODUCTION_CALLBACK_URL =
  "https://hotelapp-thegrandaurelia.onrender.com/api/v1/auth/google/callback";

function isProduction(
  nodeEnvironment: string | undefined,
  renderEnvironment: string | undefined,
): boolean {
  return nodeEnvironment === "production" || renderEnvironment === "true";
}

function isLoopbackUrl(value: string): boolean {
  const hostname = new URL(value).hostname;

  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function getGoogleCallbackUrl(
  configuredUrl: string | undefined,
  nodeEnvironment: string | undefined,
  renderEnvironment: string | undefined,
): string {
  const callbackUrl = configuredUrl?.trim();
  const production = isProduction(nodeEnvironment, renderEnvironment);

  if (!callbackUrl) {
    if (production) return PRODUCTION_CALLBACK_URL;
    throw new Error("GOOGLE_CALLBACK_URL is missing.");
  }

  if (production && isLoopbackUrl(callbackUrl)) {
    console.warn(
      "GOOGLE_CALLBACK_URL points to localhost in production; using the production OAuth callback URL.",
    );
    return PRODUCTION_CALLBACK_URL;
  }

  return callbackUrl;
}

export function getGoogleFrontendUrl(
  configuredUrl: string | undefined,
  nodeEnvironment: string | undefined,
  renderEnvironment: string | undefined,
): string {
  const frontendUrl = configuredUrl?.trim().replace(/\/+$/, "");
  const production = isProduction(nodeEnvironment, renderEnvironment);

  if (!frontendUrl) {
    return production ? PRODUCTION_FRONTEND_URL : "http://localhost:5173";
  }

  if (production && isLoopbackUrl(frontendUrl)) {
    console.warn(
      "FRONTEND_URL points to localhost in production; using the production frontend URL for Google sign-in.",
    );
    return PRODUCTION_FRONTEND_URL;
  }

  return frontendUrl;
}

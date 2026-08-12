/**
 * Cross-Origin Request Forgery (CSRF) / Origin verification.
 * Verifies Origin or Referer header against host / NEXT_PUBLIC_APP_URL for state-changing HTTP requests.
 */

export function verifyOrigin(request: Request): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase();
  // Safe read-only HTTP methods do not change state
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { valid: true };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host");

  // Non-browser or server-to-server calls may omit origin/referer in development
  if (!origin && !referer) {
    if (process.env.NODE_ENV !== "production") {
      return { valid: true };
    }
    return { valid: false, reason: "Missing Origin and Referer headers on state-changing request" };
  }

  const targetUrl = origin || referer;
  if (!targetUrl) return { valid: true };

  try {
    const parsedTarget = new URL(targetUrl);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : null;

    // Check match against current host
    if (host && (parsedTarget.host === host || parsedTarget.host === host.split(":")[0])) {
      return { valid: true };
    }

    // Check match against configured NEXT_PUBLIC_APP_URL
    if (appUrl && parsedTarget.origin === appUrl.origin) {
      return { valid: true };
    }

    // Development mode localhost match
    if (
      process.env.NODE_ENV !== "production" &&
      (parsedTarget.hostname === "localhost" || parsedTarget.hostname === "127.0.0.1")
    ) {
      return { valid: true };
    }

    return { valid: false, reason: `Cross-origin request from ${parsedTarget.origin} blocked` };
  } catch {
    return { valid: false, reason: "Invalid Origin or Referer header URL" };
  }
}

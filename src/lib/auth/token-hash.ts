import crypto from "crypto";

/**
 * Compute SHA-256 hash of a token string for safe DB persistence
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

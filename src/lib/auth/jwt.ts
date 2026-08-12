import { SignJWT, jwtVerify } from "jose";
import { getJwtSecrets } from "./config";

export interface SessionPayload {
  userId: string;
  email?: string | null;
  phone?: string | null;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  name: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Lazily-encoded secret keys. Deferred so the module can be imported in test
 * environments without crashing on missing env vars.
 */
let _accessKey: Uint8Array | null = null;
let _refreshKey: Uint8Array | null = null;

function getAccessSecretKey(): Uint8Array {
  if (!_accessKey) {
    const { accessSecret } = getJwtSecrets();
    if (accessSecret.length < 32) {
      throw new Error(
        "JWT_ACCESS_SECRET is too short (must be >= 32 characters). " +
        "Generate one with: openssl rand -base64 32"
      );
    }
    _accessKey = new TextEncoder().encode(accessSecret);
  }
  return _accessKey;
}

function getRefreshSecretKey(): Uint8Array {
  if (!_refreshKey) {
    const { refreshSecret } = getJwtSecrets();
    if (refreshSecret.length < 32) {
      throw new Error(
        "JWT_REFRESH_SECRET is too short (must be >= 32 characters). " +
        "Generate one with: openssl rand -base64 32"
      );
    }
    _refreshKey = new TextEncoder().encode(refreshSecret);
  }
  return _refreshKey;
}

export const ACCESS_COOKIE_NAME = "mediflow_access_token";
export const REFRESH_COOKIE_NAME = "mediflow_refresh_token";

/**
 * Sign an Access Token (15 minutes by default)
 * Uses JWT_ACCESS_SECRET.
 */
export async function signAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getAccessSecretKey());
}

/**
 * Sign a Refresh Token (7 days by default)
 * Uses JWT_REFRESH_SECRET (separate from access secret).
 */
export async function signRefreshToken(userId: string, role?: SessionPayload["role"]): Promise<string> {
  return new SignJWT({ userId, ...(role ? { role } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getRefreshSecretKey());
}

/**
 * Verify and decode an Access Token
 * Uses JWT_ACCESS_SECRET.
 */
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a Refresh Token
 * Uses JWT_REFRESH_SECRET.
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string; role?: SessionPayload["role"] } | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecretKey());
    if (typeof payload.userId === "string") {
      return {
        userId: payload.userId,
        role: payload.role as SessionPayload["role"] | undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

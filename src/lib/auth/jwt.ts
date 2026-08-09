import { SignJWT, jwtVerify } from "jose";

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

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET environment variable is missing or too short (must be >= 32 characters). " +
    "Generate one with: openssl rand -base64 32"
  );
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export const ACCESS_COOKIE_NAME = "mediflow_access_token";
export const REFRESH_COOKIE_NAME = "mediflow_refresh_token";

/**
 * Sign an Access Token (15 minutes by default)
 */
export async function signAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretKey);
}

/**
 * Sign a Refresh Token (7 days by default)
 */
export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verify and decode an Access Token
 */
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a Refresh Token
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}


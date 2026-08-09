import { cookies } from "next/headers";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SessionPayload,
} from "./jwt";
import { prisma } from "../db";

/**
 * Get current session user from request cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) return payload;
  }

  // If access token is expired, attempt refresh
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  const refreshPayload = await verifyRefreshToken(refreshToken);
  if (!refreshPayload || typeof refreshPayload.userId !== "string") return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: refreshPayload.userId },
      include: {
        patient: true,
        doctor: true,
        admin: true,
      },
    });

    if (!user || !user.isActive) return null;

    const name =
      user.patient?.name ||
      user.doctor?.name ||
      user.admin?.name ||
      "MediFlow User";

    const newPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      name,
    };

    const newAccessToken = await signAccessToken(newPayload);
    cookieStore.set(ACCESS_COOKIE_NAME, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 mins
    });

    return {
      ...newPayload,
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    };
  } catch {
    return null;
  }
}

/**
 * Set session cookies after successful authentication
 */
export async function setSessionCookies(payload: SessionPayload) {
  const cookieStore = await cookies();
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload.userId);

  cookieStore.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 mins
  });

  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear session cookies on logout
 */
export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}

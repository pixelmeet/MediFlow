import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookies } from "@/lib/auth/session";
import { REFRESH_COOKIE_NAME } from "@/lib/auth/jwt";
import { hashToken } from "@/lib/auth/token-hash";
import { ALLOW_MEMORY_FALLBACK } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { successResponse } from "@/lib/utils";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      try {
        await prisma.refreshToken.deleteMany({
          where: { tokenHash },
        });
      } catch (error) {
        if (!ALLOW_MEMORY_FALLBACK) {
          console.error("Database error during logout token revocation:", error);
        } else {
          console.warn("Database unavailable during logout, skipped DB token revocation in dev fallback mode");
        }
      }
    }

    await clearSessionCookies();

    return NextResponse.json(
      successResponse({ loggedOut: true }, { message: "Successfully logged out" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout API error:", error);
    await clearSessionCookies();
    return NextResponse.json(
      successResponse({ loggedOut: true }, { message: "Successfully logged out" }),
      { status: 200 }
    );
  }
}


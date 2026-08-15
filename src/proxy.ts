import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken, verifyRefreshToken, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "./lib/auth/jwt";
import { verifyOrigin } from "./lib/api/csrf";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check Origin/Referer on state-changing API endpoints
  if (pathname.startsWith("/api")) {
    const originCheck = verifyOrigin(request);
    if (!originCheck.valid) {
      return NextResponse.json(
        {
          error: {
            code: "CSRF_ERROR",
            message: originCheck.reason || "Cross-origin request blocked.",
          },
        },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // Static assets and internal paths to ignore
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const session = accessToken ? await verifyAccessToken(accessToken) : null;
  const refreshPayload = (!session && refreshToken) ? await verifyRefreshToken(refreshToken) : null;

  // Determine user role either from active session or verified refresh token
  const effectiveRole = session?.role || refreshPayload?.role;
  const isAuthenticated = !!session || !!refreshPayload;

  const isAuthRoute = pathname.startsWith("/auth") || pathname === "/login" || pathname === "/register";
  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isAdminRoute = pathname.startsWith("/admin");

  // 2. If already logged in and visiting auth pages (login/register), redirect to role dashboard
  if (isAuthenticated && isAuthRoute) {
    const role = effectiveRole || "PATIENT";
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/overview", request.url));
    }
    if (role === "DOCTOR") {
      return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/patient/dashboard", request.url));
  }

  // 3. If unauthenticated and trying to access protected routes, redirect to login with returnUrl
  if (!isAuthenticated && (isPatientRoute || isDoctorRoute || isAdminRoute)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Enforce Role-Based Access Control on all authenticated requests to protected routes
  if (isAuthenticated) {
    const role = effectiveRole || "PATIENT";
    if (isPatientRoute && role !== "PATIENT" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
    }
    if (isDoctorRoute && role !== "DOCTOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/patient/dashboard", request.url));
    }
    if (isAdminRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/patient/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

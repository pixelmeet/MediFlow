import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "./lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public asset and API paths to ignore
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const session = accessToken ? await verifyAccessToken(accessToken) : null;
  const isAuthenticated = !!session || !!refreshToken;

  const isAuthRoute = pathname.startsWith("/auth") || pathname === "/login" || pathname === "/register";
  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isAdminRoute = pathname.startsWith("/admin");

  // 1. If already logged in and visiting auth pages (login/register), redirect to role dashboard
  if (isAuthenticated && isAuthRoute) {
    const role = session?.role || "PATIENT";
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/overview", request.url));
    }
    if (role === "DOCTOR") {
      return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/patient/dashboard", request.url));
  }

  // 2. If unauthenticated and trying to access protected routes, redirect to login with returnUrl
  if (!isAuthenticated && (isPatientRoute || isDoctorRoute || isAdminRoute)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Enforce Role-Based Access Control if session is available
  if (session) {
    if (isPatientRoute && session.role !== "PATIENT" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
    }
    if (isDoctorRoute && session.role !== "DOCTOR" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/patient/dashboard", request.url));
    }
    if (isAdminRoute && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/patient/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

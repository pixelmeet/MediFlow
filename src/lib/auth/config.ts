export const AUTH_CONFIG = {
  accessTokenExpiry: "15m",
  refreshTokenExpiryDays: 7,
  otpExpiryMinutes: 5,
  otpMaxAttempts: 5,
  otpRateLimitMax: 5,
  otpRateLimitWindowMs: 15 * 60 * 1000,
  maxFailedLogins: 5,
  lockoutDurationMs: 15 * 60 * 1000,
} as const;

export const COOKIE_NAMES = {
  accessToken: "mediflow_access_token",
  refreshToken: "mediflow_refresh_token",
} as const;

export function getJwtSecrets() {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error(
      "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment"
    );
  }

  return { accessSecret, refreshSecret };
}

export function getRoleDashboard(role: string): string {
  switch (role) {
    case "PATIENT":
      return "/patient/dashboard";
    case "DOCTOR":
      return "/doctor/dashboard";
    case "ADMIN":
      return "/admin/overview";
    default:
      return "/login";
  }
}

export const AUTH_CONFIG = {
  accessTokenExpiry: "15m",
  refreshTokenExpiryDays: 7,
  otpExpiryMinutes: 5,
  otpMaxAttempts: 5,
  otpRateLimitMax: 5,
  otpRateLimitWindowMs: 15 * 60 * 1000,
  passwordResetExpiryMinutes: 30,
  passwordResetRateLimitMax: 5,
  passwordResetRateLimitWindowMs: 15 * 60 * 1000,
  maxFailedLogins: 5,
  lockoutDurationMs: 15 * 60 * 1000,
} as const;

export const COOKIE_NAMES = {
  accessToken: "mediflow_access_token",
  refreshToken: "mediflow_refresh_token",
} as const;

// Explicit opt-in required — cannot be enabled by accident from NODE_ENV.
// MUST be the exact string "true". See .env.example for documentation.
export const ALLOW_MEMORY_FALLBACK = process.env.ALLOW_MEMORY_FALLBACK === "true";

if (ALLOW_MEMORY_FALLBACK) {
  console.warn(
    "⚠️  [MediFlow] ALLOW_MEMORY_FALLBACK is enabled. " +
    "In-memory stores are active — DB revocation checks are skipped. " +
    "DO NOT run with this flag in production."
  );
}


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
      return "/auth/login";
  }
}

import { describe, it, expect } from "vitest";
import { RegisterPatientSchema, VerifyOtpSchema } from "@/lib/validation/auth";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/api/rate-limit";

describe("Auth Validation & Security", () => {
  describe("Registration Validation", () => {
    it("should accept valid registration details with uppercase, number, and special character", () => {
      const result = RegisterPatientSchema.safeParse({
        name: "Dev Patient",
        email: "dev.patient@example.com",
        phone: "+919876543210",
        password: "Password@123",
        age: 30,
        gender: "MALE",
        bloodGroup: "O+",
      });
      expect(result.success).toBe(true);
    });

    it("should reject password missing special characters", () => {
      const result = RegisterPatientSchema.safeParse({
        name: "Dev Patient",
        email: "dev.patient@example.com",
        phone: "+919876543210",
        password: "Password123", // missing special char
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasSpecialCharError = result.error.issues.some((i) =>
          i.message.includes("special character")
        );
        expect(hasSpecialCharError).toBe(true);
      }
    });

    it("should reject password shorter than 8 characters", () => {
      const result = RegisterPatientSchema.safeParse({
        name: "Dev Patient",
        email: "dev.patient@example.com",
        phone: "+919876543210",
        password: "P@1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("JWT Secret Key Separation", () => {
    it("should sign access token and decode payload with access secret", async () => {
      const payload = {
        userId: "user_test_123",
        email: "test@example.com",
        role: "PATIENT" as const,
        name: "Test User",
      };
      const token = await signAccessToken(payload);
      expect(typeof token).toBe("string");

      const decoded = await verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("user_test_123");
      expect(decoded?.role).toBe("PATIENT");
    });

    it("should sign refresh token with role and decode with refresh secret", async () => {
      const token = await signRefreshToken("user_test_123", "DOCTOR");
      expect(typeof token).toBe("string");

      const decoded = await verifyRefreshToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("user_test_123");
      expect(decoded?.role).toBe("DOCTOR");
    });

    it("should reject access token verification using refresh token verification", async () => {
      // Access tokens signed with JWT_ACCESS_SECRET should NOT verify as refresh tokens (different secret)
      const accessToken = await signAccessToken({
        userId: "user_123",
        email: "test@example.com",
        role: "PATIENT",
        name: "Test",
      });
      const verifyWithRefresh = await verifyRefreshToken(accessToken);
      expect(verifyWithRefresh).toBeNull();
    });
  });

  describe("Rate Limiter Middleware", () => {
    it("should allow requests up to limit and block subsequent hits", () => {
      const mockReq = new Request("http://localhost:3000/api/v1/auth/login", {
        headers: { "x-forwarded-for": "192.168.1.50" },
      });

      const key = "test:auth:login:192.168.1.50";
      const rl1 = rateLimit(mockReq, key, { limit: 2, windowMs: 1000 });
      expect(rl1.allowed).toBe(true);

      const rl2 = rateLimit(mockReq, key, { limit: 2, windowMs: 1000 });
      expect(rl2.allowed).toBe(true);

      const rl3 = rateLimit(mockReq, key, { limit: 2, windowMs: 1000 });
      expect(rl3.allowed).toBe(false);
      expect(rl3.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("OTP Validation & Limits", () => {
    it("should validate 6-digit OTP schema", () => {
      const valid = VerifyOtpSchema.safeParse({
        userId: "user_123",
        code: "123456",
      });
      expect(valid.success).toBe(true);

      const invalidLength = VerifyOtpSchema.safeParse({
        userId: "user_123",
        code: "12345",
      });
      expect(invalidLength.success).toBe(false);

      const nonNumeric = VerifyOtpSchema.safeParse({
        userId: "user_123",
        code: "12345a",
      });
      expect(nonNumeric.success).toBe(false);
    });
  });
});

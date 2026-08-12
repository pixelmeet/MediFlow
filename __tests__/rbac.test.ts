import { describe, it, expect } from "vitest";
import { verifyOrigin } from "@/lib/api/csrf";

describe("RBAC & Origin Verification Security", () => {
  describe("CSRF / Origin Verification", () => {
    it("should allow safe GET requests regardless of origin", () => {
      const getReq = new Request("http://localhost:3000/api/v1/doctors", {
        method: "GET",
      });
      const result = verifyOrigin(getReq);
      expect(result.valid).toBe(true);
    });

    it("should allow same-host POST requests", () => {
      const sameHostReq = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });
      const result = verifyOrigin(sameHostReq);
      expect(result.valid).toBe(true);
    });

    it("should reject cross-origin state-changing requests in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      try {
        const crossOriginReq = new Request("https://mediflow.app/api/v1/auth/login", {
          method: "POST",
          headers: {
            host: "mediflow.app",
            origin: "https://malicious-site.com",
          },
        });
        const result = verifyOrigin(crossOriginReq);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("Cross-origin request");
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      }
    });
  });
});

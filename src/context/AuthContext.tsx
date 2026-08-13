"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { RegisterPatientInput } from "@/lib/validation/auth";

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  name: string;
  displayName?: string;
  doctorId?: string;   // Doctor.id, only present when role === "DOCTOR"
  patientId?: string;  // Patient.id, only present when role === "PATIENT"
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; lockout?: boolean }>;
  registerPatient: (data: RegisterPatientInput) => Promise<{ success: boolean; userId?: string; devOtp?: string; error?: string }>;
  verifyOtp: (userId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (userId: string) => Promise<{ success: boolean; devOtp?: string; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const router = useRouter();
  const { addToast } = useToast();

  const fetchCurrentUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setUser({
            id: json.data.id,
            email: json.data.email,
            phone: json.data.phone,
            role: json.data.role,
            name: json.data.displayName || "User",
            displayName: json.data.displayName,
            doctorId: json.data.doctor?.id,
            patientId: json.data.patient?.id,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const init = async () => {
      await fetchCurrentUser();
    };
    init();
  }, [fetchCurrentUser]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        const isLockout = res.status === 423;
        return {
          success: false,
          error: json.error?.message || "Invalid credentials",
          lockout: isLockout,
        };
      }

      const loggedUser = json.data;
      setUser(loggedUser);

      addToast({
        type: "success",
        title: "Welcome back!",
        description: `Signed in as ${loggedUser.name}`,
      });

      // Role-based redirect
      if (loggedUser.role === "ADMIN") {
        router.push("/admin/overview");
      } else if (loggedUser.role === "DOCTOR") {
        router.push("/doctor/dashboard");
      } else {
        router.push("/patient/dashboard");
      }

      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const registerPatient = async (data: RegisterPatientInput) => {
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: json.error?.message || "Registration failed",
        };
      }

      addToast({
        type: "info",
        title: "OTP Verification Required",
        description: "Please enter the 6-digit verification code.",
      });

      return {
        success: true,
        userId: json.data?.id,
        devOtp: json.data?.devOtp,
      };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const verifyOtp = async (userId: string, code: string) => {
    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      const json = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: json.error?.message || "Verification failed",
        };
      }

      setUser(json.data);

      addToast({
        type: "success",
        title: "Account Verified!",
        description: "Your registration is complete.",
      });

      router.push("/patient/dashboard");
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const resendOtp = async (userId: string) => {
    try {
      const res = await fetch("/api/v1/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const json = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: json.error?.message || "Failed to resend OTP",
        };
      }

      addToast({
        type: "info",
        title: "New Code Sent",
        description: "A new 6-digit OTP has been generated.",
      });

      return {
        success: true,
        devOtp: json.data?.devOtp,
      };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      setUser(null);
      addToast({
        type: "info",
        title: "Signed Out",
        description: "You have been logged out successfully.",
      });
      router.push("/auth/login");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        registerPatient,
        verifyOtp,
        resendOtp,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

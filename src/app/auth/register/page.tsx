"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ShieldAlert, UserCheck } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RegisterFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Please enter a valid email address").trim(),
    phone: z.string().min(7, "Please enter a valid phone number").trim(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    age: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"] as const),
    bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match. Please re-enter your password.",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const router = useRouter();
  const { registerPatient } = useAuth();

  const [formData, setFormData] = React.useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    age: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  }>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "MALE",
    bloodGroup: "O+",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = RegisterFormSchema.safeParse(formData);
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || "Please check the form for errors.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
      };

      const res = await registerPatient(payload);

      if (!res.success) {
        setErrorMessage(res.error || "Registration failed. Please try again.");
      } else if (res.userId) {
        // Redirect to OTP page with userId
        const devOtpParam = res.devOtp ? `&devOtp=${encodeURIComponent(res.devOtp)}` : "";
        router.push(`/auth/verify-otp?userId=${res.userId}&email=${encodeURIComponent(formData.email)}${devOtpParam}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-serif text-2xl font-normal tracking-tight text-[hsl(var(--foreground))]">
            MediFlow
          </span>
        </Link>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-[hsl(var(--foreground))]">
          Create Patient Account
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
          Register to book doctor appointments & receive live queue alerts
        </p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
        {errorMessage && (
          <div
            className="mb-4 flex items-start gap-2 rounded-[var(--radius)] bg-[hsl(var(--danger-light))] p-3 text-xs font-medium text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]"
            role="alert"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            name="name"
            placeholder="e.g. Rahul Verma"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isLoading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              name="email"
              type="email"
              placeholder="rahul@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />

            <Input
              label="Mobile Phone *"
              name="phone"
              type="tel"
              placeholder="+919876543210"
              value={formData.phone}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password *"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />

            <Input
              label="Confirm Password *"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Age"
              name="age"
              type="number"
              min="0"
              max="120"
              placeholder="34"
              value={formData.age}
              onChange={handleChange}
              disabled={isLoading}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={isLoading}
                className="flex h-10 w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                Blood Group
              </label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                disabled={isLoading}
                className="flex h-10 w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isLoading}
          >
            <UserCheck className="h-4 w-4" />
            Continue to Verification
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-[hsl(var(--primary))] hover:underline active:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

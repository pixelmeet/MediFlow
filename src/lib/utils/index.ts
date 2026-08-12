// ─── Date & Time Helpers ─────────────────────────────────

/**
 * Format time string "HH:mm" to display format
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format date to a human-readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format date to YYYY-MM-DD for API calls
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse "HH:mm" time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to "HH:mm" string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// ─── String Helpers ──────────────────────────────────────

/**
 * Generate initials from a name (e.g., "Dr. Patel" → "DP")
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ─── Number Helpers ──────────────────────────────────────

/**
 * Format currency (INR)
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ─── API Helpers ─────────────────────────────────────────

/**
 * Standard API response envelope
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: Record<string, unknown>;
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return { data, meta };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>
): ApiResponse<never> {
  return { error: { code, message, details } };
}

/**
 * Safely parse JSON request body, returning null if empty or invalid JSON syntax.
 */
export async function safeParseJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

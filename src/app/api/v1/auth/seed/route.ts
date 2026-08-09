import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(
      successResponse(result, {
        message: "Seed completed. Demo accounts created with password 'Password@123'",
        accounts: [
          { role: "ADMIN", email: "admin@mediflow.com", password: "Password@123" },
          { role: "DOCTOR", email: "dr.patel@mediflow.com", password: "Password@123" },
          { role: "DOCTOR", email: "dr.ananya@mediflow.com", password: "Password@123" },
          { role: "PATIENT", email: "patient@mediflow.com", password: "Password@123" },
        ],
      })
    );
  } catch (error) {
    console.error("Seed API error:", error);
    return NextResponse.json(
      errorResponse("SEED_ERROR", "Failed to seed database. Check database connection in .env"),
      { status: 500 }
    );
  }
}

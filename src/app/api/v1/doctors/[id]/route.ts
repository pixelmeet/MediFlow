import { NextResponse } from "next/server";
import { DoctorService } from "@/lib/services/DoctorService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const doctor = await DoctorService.getDoctorById(params.id);

    if (!doctor) {
      return NextResponse.json(
        errorResponse("DOCTOR_NOT_FOUND", "Doctor not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(doctor));
  } catch (error) {
    console.error("Doctor detail API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve doctor details"),
      { status: 500 }
    );
  }
}

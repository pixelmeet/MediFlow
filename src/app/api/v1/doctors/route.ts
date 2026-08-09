import { NextResponse } from "next/server";
import { DoctorSearchSchema } from "@/lib/validation/doctor";
import { DoctorService } from "@/lib/services/DoctorService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      search: searchParams.get("search") || undefined,
      specialty: searchParams.get("specialty") || undefined,
      branchId: searchParams.get("branchId") || undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      language: searchParams.get("language") || undefined,
      minFee: searchParams.get("minFee") || undefined,
      maxFee: searchParams.get("maxFee") || undefined,
      date: searchParams.get("date") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const parseResult = DoctorSearchSchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid doctor search parameters"),
        { status: 422 }
      );
    }

    const [result, filterOptions] = await Promise.all([
      DoctorService.searchDoctors(parseResult.data),
      DoctorService.getFilterOptions(),
    ]);

    return NextResponse.json(
      successResponse(result.doctors, {
        total: result.total,
        filterOptions,
      })
    );
  } catch (error) {
    console.error("Doctors API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve doctors list"),
      { status: 500 }
    );
  }
}

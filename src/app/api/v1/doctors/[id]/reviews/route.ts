import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { CreateReviewSchema } from "@/lib/validation/review";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const doctorId = params.id;

    try {
      const reviews = await prisma.review.findMany({
        where: { doctorId },
        include: {
          patient: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted = reviews.map((r) => ({
        id: r.id,
        doctorId: r.doctorId,
        patientName: r.patient.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      }));

      return NextResponse.json(successResponse(formatted));
    } catch (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error("GET doctor reviews error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve doctor reviews"),
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to submit a review"),
        { status: 401 }
      );
    }

    if (session.role !== "PATIENT") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only patients can submit reviews for doctors"),
        { status: 403 }
      );
    }

    const params = await props.params;
    const doctorId = params.id;

    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }

    const parseResult = CreateReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid review data"),
        { status: 422 }
      );
    }

    try {
      // Find patient record
      const patient = await prisma.patient.findFirst({
        where: { userId: session.userId },
      });

      if (!patient) {
        return NextResponse.json(
          errorResponse("PATIENT_NOT_FOUND", "Patient profile not found. Please complete registration."),
          { status: 404 }
        );
      }

      // Upsert review (one review per patient per doctor)
      const review = await prisma.review.upsert({
        where: {
          doctorId_patientId: {
            doctorId,
            patientId: patient.id,
          },
        },
        update: {
          rating: parseResult.data.rating,
          comment: parseResult.data.comment,
        },
        create: {
          doctorId,
          patientId: patient.id,
          rating: parseResult.data.rating,
          comment: parseResult.data.comment,
        },
      });

      return NextResponse.json(
        successResponse(
          {
            id: review.id,
            doctorId: review.doctorId,
            patientName: patient.name,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
          },
          { message: "Review submitted successfully" }
        ),
        { status: 201 }
      );
    } catch (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error("POST doctor review error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to submit review"),
      { status: 500 }
    );
  }
}

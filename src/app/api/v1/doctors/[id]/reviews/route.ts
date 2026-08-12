import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ALLOW_MEMORY_FALLBACK } from "@/lib/auth/config";
import { CreateReviewSchema } from "@/lib/validation/review";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

interface MemoryReview {
  id: string;
  doctorId: string;
  patientName: string;
  patientUserId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

const memoryReviews = new Map<string, MemoryReview[]>([
  [
    "doc_patel_01",
    [
      {
        id: "rev_1",
        doctorId: "doc_patel_01",
        patientName: "Aarav Sharma",
        patientUserId: "user_aarav",
        rating: 5,
        comment: "Excellent cardiologist. Explained the diagnosis clearly and answered all questions with immense patience.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "rev_2",
        doctorId: "doc_patel_01",
        patientName: "Pooja Mehta",
        patientUserId: "user_pooja",
        rating: 5,
        comment: "Very professional consultation and minimal wait time using the queue token system.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  ],
]);

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
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      const list = memoryReviews.get(doctorId) || [];
      return NextResponse.json(successResponse(list));
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
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }

      const list = memoryReviews.get(doctorId) || [];
      const newMemReview: MemoryReview = {
        id: `rev_${Date.now()}`,
        doctorId,
        patientName: session.name || "Patient",
        patientUserId: session.userId,
        rating: parseResult.data.rating,
        comment: parseResult.data.comment,
        createdAt: new Date().toISOString(),
      };
      const existingIdx = list.findIndex((r) => r.patientUserId === session.userId);
      if (existingIdx >= 0) {
        list[existingIdx] = newMemReview;
      } else {
        list.unshift(newMemReview);
      }
      memoryReviews.set(doctorId, list);

      return NextResponse.json(
        successResponse(newMemReview, { message: "Review submitted successfully" }),
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("POST doctor review error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to submit review"),
      { status: 500 }
    );
  }
}

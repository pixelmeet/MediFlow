import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ConsultationService } from "@/lib/services/ConsultationService";
import { CompleteConsultationSchema, SaveConsultationDraftSchema } from "@/lib/validation/consultation";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ tokenId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctor or hospital staff can view consultation details"),
        { status: 403 }
      );
    }

    const params = await props.params;
    const result = await ConsultationService.getConsultationDetails(
      params.tokenId,
      session.userId,
      session.role
    );

    if (!result.success || !result.data) {
      if (result.error === "FORBIDDEN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.message || "You are not assigned to this patient's consultation."),
          { status: 403 }
        );
      }

      return NextResponse.json(
        errorResponse("NOT_FOUND", result.message || "Consultation session not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(result.data));
  } catch (error) {
    console.error("Get consultation API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve consultation details"),
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  props: { params: Promise<{ tokenId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctor can start a consultation"),
        { status: 403 }
      );
    }

    const params = await props.params;
    const result = await ConsultationService.startConsultation(
      params.tokenId,
      session.userId,
      session.role
    );

    if (!result.success) {
      if (result.error === "FORBIDDEN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.message || "You are not assigned to this patient's consultation."),
          { status: 403 }
        );
      }

      if (result.error === "NOT_FOUND") {
        return NextResponse.json(
          errorResponse("NOT_FOUND", result.message || "Appointment not found"),
          { status: 404 }
        );
      }

      return NextResponse.json(
        errorResponse("START_FAILED", result.message || "Failed to start consultation"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { consultationId: result.consultationId, status: "IN_CONSULTATION" },
        { message: "Consultation started." }
      )
    );
  } catch (error) {
    console.error("Start consultation API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to start consultation"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ tokenId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctor can complete or save consultations"),
        { status: 403 }
      );
    }

    const params = await props.params;
    const body = await request.json();

    if (body.action === "save_draft") {
      const draftParse = SaveConsultationDraftSchema.safeParse(body);
      if (!draftParse.success) {
        return NextResponse.json(
          errorResponse("VALIDATION_ERROR", "Invalid draft consultation data"),
          { status: 422 }
        );
      }

      const result = await ConsultationService.saveDraft(
        params.tokenId,
        draftParse.data,
        session.userId,
        session.role
      );

      if (!result.success) {
        if (result.error === "FORBIDDEN") {
          return NextResponse.json(
            errorResponse("FORBIDDEN", result.message || "You are not assigned to this patient's consultation."),
            { status: 403 }
          );
        }

        if (result.error === "NOT_FOUND") {
          return NextResponse.json(
            errorResponse("NOT_FOUND", result.message || "Appointment not found"),
            { status: 404 }
          );
        }

        return NextResponse.json(
          errorResponse("SAVE_DRAFT_FAILED", result.message || "Could not save draft"),
          { status: 400 }
        );
      }

      return NextResponse.json(
        successResponse({ saved: true }, { message: "Consultation draft autosaved." })
      );
    }

    // Otherwise complete consultation
    const completeParse = CompleteConsultationSchema.safeParse(body);
    if (!completeParse.success) {
      return NextResponse.json(
        errorResponse(
          "VALIDATION_ERROR",
          completeParse.error.issues[0]?.message || "Diagnosis is required to complete consultation"
        ),
        { status: 422 }
      );
    }

    const result = await ConsultationService.completeConsultation(
      params.tokenId,
      completeParse.data,
      session.userId,
      session.role
    );

    if (!result.success) {
      if (result.error === "FORBIDDEN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.message || "You are not assigned to this patient's consultation."),
          { status: 403 }
        );
      }

      if (result.error === "NOT_FOUND") {
        return NextResponse.json(
          errorResponse("NOT_FOUND", result.message || "Appointment not found"),
          { status: 404 }
        );
      }

      return NextResponse.json(
        errorResponse("COMPLETE_FAILED", result.message || "Failed to complete consultation"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        {
          completed: true,
          prescriptionNumber: result.prescriptionNumber,
        },
        {
          message: `Consultation completed successfully! Prescription #${result.prescriptionNumber} generated.`,
        }
      )
    );
  } catch (error) {
    console.error("Update consultation API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update consultation"),
      { status: 500 }
    );
  }
}

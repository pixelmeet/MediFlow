import { NextResponse } from "next/server";
import { SymptomCheckerSchema } from "@/lib/validation/ai";
import { AiAssistantService } from "@/lib/services/AiAssistantService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = SymptomCheckerSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Please describe your symptoms adequately", fieldErrors),
        { status: 400 }
      );
    }

    const analysis = AiAssistantService.analyzeSymptoms(parseResult.data);

    return NextResponse.json(
      successResponse(analysis, {
        timestamp: new Date().toISOString(),
        guardrailsEnforced: true,
      })
    );
  } catch (error) {
    console.error("AI Symptom Checker API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to analyze symptoms"),
      { status: 500 }
    );
  }
}

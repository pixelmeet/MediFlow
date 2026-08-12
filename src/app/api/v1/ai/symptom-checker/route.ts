import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { SymptomCheckerSchema } from "@/lib/validation/ai";
import { AiAssistantService } from "@/lib/services/AiAssistantService";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";
import { rateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, "ai:symptom-checker", { limit: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    // Require authenticated PATIENT — this is a paid AI call
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to use the symptom checker"),
        { status: 401 }
      );
    }

    if (session.role !== "PATIENT") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "The symptom checker is only available to patients"),
        { status: 403 }
      );
    }

    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }
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


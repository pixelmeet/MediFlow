import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProcessRefundSchema } from "@/lib/validation/payments";
import { PaymentService } from "@/lib/services/PaymentService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to process refund"),
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = ProcessRefundSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid refund payload", fieldErrors),
        { status: 400 }
      );
    }

    const result = await PaymentService.processRefund(parseResult.data, session.userId);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("REFUND_FAILED", result.error || "Refund processing failed"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.data, { message: "Refund processed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Refund processing API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Internal error processing refund"),
      { status: 500 }
    );
  }
}

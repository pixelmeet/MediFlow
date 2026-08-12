import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProcessPaymentSchema } from "@/lib/validation/payments";
import { PaymentService } from "@/lib/services/PaymentService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to process payment"),
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = ProcessPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid payment payload", fieldErrors),
        { status: 400 }
      );
    }

    const result = await PaymentService.processPayment(parseResult.data, session.userId);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("PAYMENT_FAILED", result.error || "Payment processing failed"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.data, { message: "Payment processed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment processing API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Internal error processing payment"),
      { status: 500 }
    );
  }
}

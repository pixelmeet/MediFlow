import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";
import { successResponse } from "@/lib/utils";

export async function POST() {
  await clearSessionCookies();
  return NextResponse.json(
    successResponse({ loggedOut: true }, { message: "Successfully logged out" }),
    { status: 200 }
  );
}

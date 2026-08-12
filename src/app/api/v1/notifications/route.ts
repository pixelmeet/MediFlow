import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { NotificationService } from "@/lib/services/NotificationService";
import {
  CreateNotificationSchema,
  NotificationFilterSchema,
  UpdateNotificationSchema,
} from "@/lib/validation/notifications";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view notifications"),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = NotificationFilterSchema.parse({
      unreadOnly: searchParams.get("unreadOnly") || "false",
      limit: searchParams.get("limit") || "30",
    });

    const data = await NotificationService.getUserNotifications(session.userId, {
      unreadOnly: filter.unreadOnly === "true",
      limit: filter.limit,
    });

    return NextResponse.json(successResponse(data));
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve notifications"),
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to update notifications"),
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid update payload"),
        { status: 400 }
      );
    }

    const { action, notificationId } = parseResult.data;

    if (action === "mark_all_read") {
      await NotificationService.markAllAsRead(session.userId);
      return NextResponse.json(
        successResponse({ updated: true }, { message: "All notifications marked as read" })
      );
    }

    if (action === "mark_read" && notificationId) {
      await NotificationService.markAsRead(notificationId, session.userId);
      return NextResponse.json(
        successResponse({ updated: true }, { message: "Notification marked as read" })
      );
    }

    return NextResponse.json(
      errorResponse("BAD_REQUEST", "Missing notificationId for mark_read"),
      { status: 400 }
    );
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update notification"),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to dispatch notification"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only administrators can dispatch notifications to users"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = CreateNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid notification dispatch payload"),
        { status: 400 }
      );
    }

    const created = await NotificationService.createNotification(parseResult.data);
    return NextResponse.json(successResponse(created), { status: 201 });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to create notification"),
      { status: 500 }
    );
  }
}

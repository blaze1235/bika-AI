import { prisma } from "@/lib/db";

/**
 * Append a row to the activity log. Never throws — logging must not
 * break the main flow.
 */
export async function logActivity(
  userId: string | null,
  username: string,
  action: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: { userId, username, action, details },
    });
  } catch (e) {
    console.error("activity log failed", e);
  }
}

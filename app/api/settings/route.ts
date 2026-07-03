import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, badRequest } from "@/lib/api";

/** Admin: update key/value settings (company info etc.). */
export const PUT = apiHandler(async (request: NextRequest) => {
  await requireRole("ADMIN");
  const body = await request.json().catch(() => null);
  const entries = Object.entries(body ?? {});
  if (entries.length === 0) return badRequest("Нет данных");

  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  return NextResponse.json({ ok: true });
});

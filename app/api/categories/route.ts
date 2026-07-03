import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, badRequest } from "@/lib/api";

/** Admin or distributor: create a category (shared across the platform). */
export const POST = apiHandler(async (request: NextRequest) => {
  await requireRole("ADMIN", "DISTRIBUTOR");
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return badRequest("Укажите название категории");

  const exists = await prisma.category.findUnique({ where: { name } });
  if (exists) return badRequest("Такая категория уже существует");

  const category = await prisma.category.create({ data: { name } });
  return NextResponse.json(category, { status: 201 });
});

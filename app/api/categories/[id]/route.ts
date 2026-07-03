import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, badRequest, notFound } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: NextRequest, { params }: Params) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return badRequest("Укажите название категории");

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return notFound();

  await prisma.category.update({ where: { id }, data: { name } });
  return NextResponse.json({ ok: true });
});

export const DELETE = apiHandler(async (_request: NextRequest, { params }: Params) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return notFound();

  // Products keep existing but lose the category (SetNull in schema).
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

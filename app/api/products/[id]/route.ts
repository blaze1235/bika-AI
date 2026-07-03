import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, AuthError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest, notFound } from "@/lib/api";
import { parseProductBody } from "@/lib/product-validation";

type Params = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string, role: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return null;
  // Distributors may only touch their own products; admin can touch all.
  if (role === "DISTRIBUTOR" && product.distributorId !== userId) {
    throw new AuthError(403, "Это товар другого дистрибьютора");
  }
  return product;
}

export const PATCH = apiHandler(async (request: NextRequest, { params }: Params) => {
  const session = await requireRole("DISTRIBUTOR", "ADMIN");
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const product = await findOwned(id, session.userId, session.role);
  if (!product) return notFound("Товар не найден");

  const parsed = parseProductBody(body);
  if ("error" in parsed) return badRequest(parsed.error);

  await prisma.product.update({ where: { id }, data: parsed.data });

  await logActivity(session.userId, session.username, "Изменён товар", parsed.data.name);
  return NextResponse.json({ ok: true });
});

export const DELETE = apiHandler(async (_request: NextRequest, { params }: Params) => {
  const session = await requireRole("DISTRIBUTOR", "ADMIN");
  const { id } = await params;

  const product = await findOwned(id, session.userId, session.role);
  if (!product) return notFound("Товар не найден");

  await prisma.product.delete({ where: { id } });

  await logActivity(session.userId, session.username, "Удалён товар", product.name);
  return NextResponse.json({ ok: true });
});

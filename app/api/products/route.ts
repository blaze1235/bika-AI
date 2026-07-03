import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest } from "@/lib/api";
import { parseProductBody } from "@/lib/product-validation";

/** Distributor (own) or admin (any distributor via distributorId): create product. */
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireRole("DISTRIBUTOR", "ADMIN");
  const body = await request.json().catch(() => null);

  const parsed = parseProductBody(body);
  if ("error" in parsed) return badRequest(parsed.error);

  const distributorId =
    session.role === "ADMIN" ? String(body?.distributorId ?? "") : session.userId;

  if (session.role === "ADMIN") {
    const dist = await prisma.user.findUnique({ where: { id: distributorId } });
    if (!dist || dist.role !== "DISTRIBUTOR") {
      return badRequest("Выберите дистрибьютора");
    }
  }

  const product = await prisma.product.create({
    data: { ...parsed.data, distributorId },
  });

  await logActivity(
    session.userId,
    session.username,
    "Добавлен товар",
    product.name
  );

  return NextResponse.json({ id: product.id }, { status: 201 });
});

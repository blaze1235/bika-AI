import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest, notFound } from "@/lib/api";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/** Distributor (own orders) or admin: move an order to the next status. */
export const PATCH = apiHandler(async (request: NextRequest, { params }: Params) => {
  const session = await requireRole("DISTRIBUTOR", "ADMIN");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as OrderStatus;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return notFound("Заказ не найден");
  if (session.role === "DISTRIBUTOR" && order.distributorId !== session.userId) {
    return notFound("Заказ не найден");
  }

  const allowed = STATUS_FLOW[order.status];
  // Admin may set any status (god mode); distributor follows the flow.
  if (session.role === "DISTRIBUTOR" && !allowed.includes(status)) {
    return badRequest(
      `Из статуса «${STATUS_LABELS[order.status]}» нельзя перейти в «${STATUS_LABELS[status] ?? status}»`
    );
  }
  if (!Object.keys(STATUS_FLOW).includes(status)) {
    return badRequest("Неверный статус");
  }

  await prisma.order.update({ where: { id }, data: { status } });

  await logActivity(
    session.userId,
    session.username,
    "Изменён статус заказа",
    `№${order.number} → ${STATUS_LABELS[status]}`
  );

  return NextResponse.json({ ok: true });
});

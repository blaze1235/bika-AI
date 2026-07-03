import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest, notFound } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Admin: edit user profile, reset password, toggle active. */
export const PATCH = apiHandler(async (request: NextRequest, { params }: Params) => {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFound("Пользователь не найден");

  const data: Record<string, unknown> = {};

  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body?.businessName !== undefined) data.businessName = body.businessName?.trim() || null;
  if (body?.phone !== undefined) data.phone = body.phone?.trim() || null;
  if (body?.address !== undefined) data.address = body.address?.trim() || null;
  if (typeof body?.active === "boolean") {
    if (user.id === session.userId && body.active === false) {
      return badRequest("Нельзя деактивировать собственный аккаунт");
    }
    data.active = body.active;
  }
  if (typeof body?.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return badRequest("Пароль должен быть не короче 6 символов");
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  await prisma.user.update({ where: { id }, data });

  await logActivity(
    session.userId,
    session.username,
    data.passwordHash ? "Сброшен пароль пользователя" : "Изменён пользователь",
    user.username
  );

  return NextResponse.json({ ok: true });
});

/** Admin: delete a user (orders cascade). */
export const DELETE = apiHandler(async (_request: NextRequest, { params }: Params) => {
  const session = await requireRole("ADMIN");
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFound("Пользователь не найден");
  if (user.id === session.userId) {
    return badRequest("Нельзя удалить собственный аккаунт");
  }

  await prisma.user.delete({ where: { id } });

  await logActivity(
    session.userId,
    session.username,
    "Удалён пользователь",
    `${user.username} (${user.role})`
  );

  return NextResponse.json({ ok: true });
});

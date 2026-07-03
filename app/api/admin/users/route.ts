import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest } from "@/lib/api";
import type { Role } from "@prisma/client";

const CREATABLE_ROLES: Role[] = ["BUYER", "DISTRIBUTOR", "ADMIN"];

/** Admin: create a user with a preset password. */
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireRole("ADMIN");
  const body = await request.json().catch(() => null);

  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = body?.role as Role;
  const name = String(body?.name ?? "").trim();

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return badRequest(
      "Логин: 3-32 символа, только латиница, цифры, точки и дефисы"
    );
  }
  if (password.length < 6) {
    return badRequest("Пароль должен быть не короче 6 символов");
  }
  if (!CREATABLE_ROLES.includes(role)) return badRequest("Неверная роль");
  if (!name) return badRequest("Укажите имя");

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return badRequest("Такой логин уже занят");

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      name,
      businessName: body?.businessName?.trim() || null,
      phone: body?.phone?.trim() || null,
      address: body?.address?.trim() || null,
    },
  });

  await logActivity(
    session.userId,
    session.username,
    "Создан пользователь",
    `${user.username} (${user.role})`
  );

  return NextResponse.json({ id: user.id }, { status: 201 });
});

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  roleHome,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest } from "@/lib/api";

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!username || !password) {
    return badRequest("Введите логин и пароль");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const invalid = NextResponse.json(
    { error: "Неверный логин или пароль" },
    { status: 401 }
  );

  if (!user || !user.active) return invalid;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return invalid;

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  await logActivity(user.id, user.username, "Вход в систему");

  const res = NextResponse.json({ redirect: roleHome(user.role) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
});

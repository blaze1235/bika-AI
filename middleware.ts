import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, roleHome, SESSION_COOKIE } from "@/lib/auth";
import type { Role } from "@prisma/client";

// Which role owns which section of the app.
const PROTECTED: Array<{ prefix: string; role: Role }> = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/distributor", role: "DISTRIBUTOR" },
  { prefix: "/shop", role: "BUYER" },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Logged-in users hitting the login page go straight to their portal.
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(roleHome(session.role), request.url));
  }

  const rule = PROTECTED.find((r) => pathname.startsWith(r.prefix));
  if (rule) {
    if (!session) {
      const login = new URL("/login", request.url);
      return NextResponse.redirect(login);
    }
    if (session.role !== rule.role) {
      return NextResponse.redirect(new URL(roleHome(session.role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/distributor/:path*", "/shop/:path*", "/login"],
};

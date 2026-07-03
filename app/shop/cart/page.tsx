import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CartClient } from "./cart-client";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await requireRole("BUYER");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { address: true },
  });

  return <CartClient defaultAddress={user?.address ?? ""} />;
}

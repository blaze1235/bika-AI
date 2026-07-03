import { prisma } from "@/lib/db";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      username: true,
      role: true,
      name: true,
      businessName: true,
      phone: true,
      address: true,
      active: true,
      createdAt: true,
      _count: { select: { ordersAsBuyer: true, ordersAsDistributor: true, products: true } },
    },
  });

  return (
    <UsersClient
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        orders: u.role === "BUYER" ? u._count.ordersAsBuyer : u._count.ordersAsDistributor,
        products: u._count.products,
      }))}
    />
  );
}

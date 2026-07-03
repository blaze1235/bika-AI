import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { OrderDetail } from "@/components/order-detail";

export const dynamic = "force-dynamic";

export default async function DistributorOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("DISTRIBUTOR");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      buyer: {
        select: { name: true, businessName: true, phone: true, address: true, username: true },
      },
      distributor: { select: { name: true, businessName: true, phone: true } },
    },
  });
  // Distributors can only open their own orders.
  if (!order || order.distributorId !== session.userId) notFound();

  return (
    <OrderDetail
      order={order}
      backHref="/distributor/orders"
      backLabel="Все заказы"
      canManage
      showBuyer
    />
  );
}

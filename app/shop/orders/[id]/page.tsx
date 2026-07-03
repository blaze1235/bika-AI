import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { OrderDetail } from "@/components/order-detail";

export const dynamic = "force-dynamic";

export default async function BuyerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("BUYER");
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
  // Buyers can only open their own orders.
  if (!order || order.buyerId !== session.userId) notFound();

  return (
    <OrderDetail
      order={order}
      backHref="/shop/orders"
      backLabel="Мои заказы"
      showDistributor
    />
  );
}

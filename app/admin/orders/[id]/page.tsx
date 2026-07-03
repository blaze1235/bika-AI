import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OrderDetail } from "@/components/order-detail";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  if (!order) notFound();

  return (
    <OrderDetail
      order={order}
      backHref="/admin/orders"
      backLabel="Все заказы"
      canManage
      showBuyer
      showDistributor
    />
  );
}

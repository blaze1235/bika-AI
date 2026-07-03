import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/portal-shell";
import { OrdersTable, StatusFilter } from "@/components/orders-table";
import { CsvButton } from "@/components/csv-button";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export default async function DistributorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole("DISTRIBUTOR");
  const { status } = await searchParams;
  const statusFilter = STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  const orders = await prisma.order.findMany({
    where: {
      distributorId: session.userId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { number: "desc" },
    include: {
      buyer: { select: { businessName: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Заказы"
        text="Входящие заказы от ваших покупателей"
        action={<CsvButton />}
      />
      <StatusFilter current={status} basePath="/distributor/orders" />
      <OrdersTable
        hrefBase="/distributor/orders"
        showBuyer
        orders={orders.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          total: o.total,
          createdAt: o.createdAt,
          itemCount: o._count.items,
          buyerLabel: o.buyer.businessName ?? o.buyer.name,
        }))}
      />
    </>
  );
}

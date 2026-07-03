import { prisma } from "@/lib/db";
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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  const orders = await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { number: "desc" },
    include: {
      buyer: { select: { businessName: true, name: true } },
      distributor: { select: { businessName: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Заказы"
        text="Все заказы платформы"
        action={<CsvButton />}
      />
      <StatusFilter current={status} basePath="/admin/orders" />
      <OrdersTable
        hrefBase="/admin/orders"
        showBuyer
        showDistributor
        orders={orders.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          total: o.total,
          createdAt: o.createdAt,
          itemCount: o._count.items,
          buyerLabel: o.buyer.businessName ?? o.buyer.name,
          distributorLabel: o.distributor.businessName ?? o.distributor.name,
        }))}
      />
    </>
  );
}

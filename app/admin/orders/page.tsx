import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/portal-shell";
import { OrdersTable, OrdersGrid, StatusFilter } from "@/components/orders-table";
import { ViewToggleLinks, type ViewMode } from "@/components/view-toggle";
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
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { status, view: viewParam } = await searchParams;
  const statusFilter = STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;
  const view: ViewMode = viewParam === "grid" ? "grid" : "list";

  const orders = await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { number: "desc" },
    include: {
      buyer: { select: { businessName: true, name: true } },
      distributor: { select: { businessName: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  const rows = orders.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt,
    itemCount: o._count.items,
    buyerLabel: o.buyer.businessName ?? o.buyer.name,
    distributorLabel: o.distributor.businessName ?? o.distributor.name,
  }));

  return (
    <>
      <PageHeader
        title="Заказы"
        text="Все заказы платформы"
        action={<CsvButton />}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <StatusFilter current={status} basePath="/admin/orders" />
        <ViewToggleLinks
          view={view}
          hrefList={`/admin/orders?${status ? `status=${status}&` : ""}view=list`}
          hrefGrid={`/admin/orders?${status ? `status=${status}&` : ""}view=grid`}
        />
      </div>
      {view === "grid" ? (
        <OrdersGrid hrefBase="/admin/orders" showBuyer showDistributor orders={rows} />
      ) : (
        <OrdersTable hrefBase="/admin/orders" showBuyer showDistributor orders={rows} />
      )}
    </>
  );
}

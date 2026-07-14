import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
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

export default async function DistributorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const session = await requireRole("DISTRIBUTOR");
  const { status, view: viewParam } = await searchParams;
  const statusFilter = STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;
  const view: ViewMode = viewParam === "grid" ? "grid" : "list";

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

  const rows = orders.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt,
    itemCount: o._count.items,
    buyerLabel: o.buyer.businessName ?? o.buyer.name,
  }));

  return (
    <>
      <PageHeader
        title="Заказы"
        text="Входящие заказы от ваших покупателей"
        action={<CsvButton />}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <StatusFilter current={status} basePath="/distributor/orders" />
        <ViewToggleLinks
          view={view}
          hrefList={`/distributor/orders?${status ? `status=${status}&` : ""}view=list`}
          hrefGrid={`/distributor/orders?${status ? `status=${status}&` : ""}view=grid`}
        />
      </div>
      {view === "grid" ? (
        <OrdersGrid hrefBase="/distributor/orders" showBuyer orders={rows} />
      ) : (
        <OrdersTable hrefBase="/distributor/orders" showBuyer orders={rows} />
      )}
    </>
  );
}

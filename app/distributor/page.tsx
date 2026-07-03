import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { money, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DistributorDashboard() {
  const session = await requireRole("DISTRIBUTOR");
  const my = { distributorId: session.userId };

  const [pendingCount, orderCount, revenue, productCount, recent, topProducts] =
    await Promise.all([
      prisma.order.count({ where: { ...my, status: "PENDING" } }),
      prisma.order.count({ where: my }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { ...my, status: { not: "CANCELLED" } },
      }),
      prisma.product.count({ where: my }),
      prisma.order.findMany({
        where: my,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { businessName: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productName"],
        where: { order: { ...my, status: { not: "CANCELLED" } } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { subtotal: "desc" } },
        take: 5,
      }),
    ]);

  return (
    <>
      <PageHeader
        title="Обзор продаж"
        text="Ваши заказы, выручка и топ товаров"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Новые заказы"
          value={String(pendingCount)}
          sub={pendingCount > 0 ? "требуют подтверждения" : "всё обработано"}
        />
        <StatCard label="Заказов всего" value={String(orderCount)} />
        <StatCard label="Выручка" value={money(revenue._sum.total ?? 0)} sub="без отменённых" />
        <StatCard label="Товаров в каталоге" value={String(productCount)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Последние заказы</h2>
            <Link
              href="/distributor/orders"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Все →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Заказов пока нет. Они появятся, когда покупатели начнут заказывать ваши
              товары.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/distributor/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 -mx-2 rounded-lg px-2 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        №{o.number} · {o.buyer.businessName ?? o.buyer.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatDateTime(o.createdAt)} · {o._count.items} поз.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium">{money(o.total)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            Топ товаров по выручке
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-neutral-400">Нет данных о продажах</p>
          ) : (
            <ul className="space-y-2.5">
              {topProducts.map((p, i) => (
                <li key={p.productName} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-700">
                    {p.productName}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {p._sum.quantity} ед.
                  </span>
                  <span className="shrink-0 font-medium text-neutral-800">
                    {money(p._sum.subtotal ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

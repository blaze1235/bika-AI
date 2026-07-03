import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { money, formatDateTime } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [buyers, distributors, products, orderCount, revenue, recent, topProducts, volumeByDistributor, volumeByBuyer] =
    await Promise.all([
      prisma.user.count({ where: { role: "BUYER" } }),
      prisma.user.count({ where: { role: "DISTRIBUTOR" } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "CANCELLED" } },
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { businessName: true, name: true } },
          distributor: { select: { businessName: true, name: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({
        by: ["distributorId"],
        _count: true,
        _sum: { total: true },
        where: { status: { not: "CANCELLED" } },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({
        by: ["buyerId"],
        _count: true,
        _sum: { total: true },
        where: { status: { not: "CANCELLED" } },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
    ]);

  const userIds = [
    ...volumeByDistributor.map((v) => v.distributorId),
    ...volumeByBuyer.map((v) => v.buyerId),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, businessName: true },
  });
  const userName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u?.businessName ?? u?.name ?? "—";
  };

  return (
    <>
      <PageHeader title="Обзор платформы" text="Ключевые показатели Bika" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Заказов всего" value={String(orderCount)} />
        <StatCard label="Оборот" value={money(revenue._sum.total ?? 0)} sub="без отменённых" />
        <StatCard label="Покупателей" value={String(buyers)} />
        <StatCard label="Дистрибьюторов" value={String(distributors)} sub={`${products} товаров`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            Последние заказы
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-400">Заказов пока нет</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-neutral-50 -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        №{o.number} · {o.buyer.businessName ?? o.buyer.name}
                      </p>
                      <p className="truncate text-xs text-neutral-400">
                        {o.distributor.businessName ?? o.distributor.name} ·{" "}
                        {formatDateTime(o.createdAt)}
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

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">
              Топ товаров
            </h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-neutral-400">Нет данных</p>
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
                    <span className="shrink-0 text-neutral-400">
                      {p._sum.quantity} ед.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">
              Объём по дистрибьюторам
            </h2>
            <VolumeList
              rows={volumeByDistributor.map((v) => ({
                name: userName(v.distributorId),
                count: v._count,
                total: v._sum.total ?? 0,
              }))}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">
              Объём по покупателям
            </h2>
            <VolumeList
              rows={volumeByBuyer.map((v) => ({
                name: userName(v.buyerId),
                count: v._count,
                total: v._sum.total ?? 0,
              }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function VolumeList({
  rows,
}: {
  rows: { name: string; count: number; total: number }[];
}) {
  if (rows.length === 0)
    return <p className="text-sm text-neutral-400">Нет данных</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate text-neutral-700">{r.name}</span>
          <span className="shrink-0 text-neutral-400">
            {r.count} зак. · <span className="text-neutral-700 font-medium">{money(r.total)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

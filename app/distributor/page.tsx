import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { money, formatDateTime } from "@/lib/format";
import { cx } from "@/lib/cx";

export const dynamic = "force-dynamic";

export default async function DistributorDashboard() {
  const session = await requireRole("DISTRIBUTOR");
  const my = { distributorId: session.userId };

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [byStatus, revenue, productCount, recent, topProducts, weekOrders] =
    await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: my,
        _count: true,
      }),
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
      prisma.order.findMany({
        where: { ...my, status: { not: "CANCELLED" }, createdAt: { gte: weekStart } },
        select: { createdAt: true, total: true },
        take: 5000,
      }),
    ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const pendingCount = count("PENDING");
  const inWork = count("CONFIRMED") + count("SHIPPED");
  const delivered = count("DELIVERED");

  const DAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const salesBars = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const total = weekOrders
      .filter((o) => o.createdAt.toDateString() === day.toDateString())
      .reduce((s, o) => s + o.total, 0);
    return { label: DAY_LABELS[day.getDay()], total };
  });
  const weekTotal = salesBars.reduce((s, b) => s + b.total, 0);
  const maxBar = Math.max(1, ...salesBars.map((b) => b.total));

  return (
    <>
      <PageHeader
        title="Обзор продаж"
        text="Ваши заказы, выручка и топ товаров"
      />

      {/* Clickable order pipeline */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <PipelineCard
          href="/distributor/orders?status=PENDING"
          label="Новые"
          value={pendingCount}
          sub={pendingCount > 0 ? "требуют подтверждения" : "всё обработано"}
          highlight={pendingCount > 0}
        />
        <PipelineCard
          href="/distributor/orders?status=CONFIRMED"
          label="В работе"
          value={inWork}
          sub="подтверждены и отправлены"
        />
        <PipelineCard
          href="/distributor/orders?status=DELIVERED"
          label="Доставлено"
          value={delivered}
        />
        <div className="rounded-2xl bg-brand-600 p-4 shadow-md shadow-brand-600/30">
          <p className="text-sm text-on-primary/75">Выручка</p>
          <p className="mt-1 truncate font-mono text-2xl font-bold tracking-tight text-on-primary">
            {money(revenue._sum.total ?? 0)}
          </p>
          <p className="mt-1 text-xs text-on-primary/60">
            {productCount} товаров в каталоге
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Продажи за неделю</h2>
            <span className="font-mono text-sm text-neutral-400">{money(weekTotal)}</span>
          </div>
          <div className="flex h-40 items-end justify-between gap-2.5">
            {salesBars.map((b, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className={cx(
                    "w-full max-w-9 rounded-t-lg rounded-b-sm",
                    b.total === maxBar && b.total > 0 ? "bg-brand-600" : "bg-brand-200"
                  )}
                  style={{ height: `${Math.max(4, (b.total / maxBar) * 100)}%` }}
                />
                <span className="text-xs font-medium text-neutral-400">{b.label}</span>
              </div>
            ))}
          </div>
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
                  <span className="shrink-0 font-mono font-medium text-neutral-800">
                    {money(p._sum.subtotal ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
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
      </div>
    </>
  );
}

function PipelineCard({
  href,
  label,
  value,
  sub,
  highlight,
}: {
  href: string;
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "rounded-2xl p-4 ring-1 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        highlight
          ? "bg-brand-50 ring-brand-200 hover:ring-brand-300"
          : "bg-white ring-brand-950/5 hover:ring-brand-200"
      )}
    >
      <p className={cx("text-sm", highlight ? "text-brand-700" : "text-neutral-500")}>
        {label}
      </p>
      <p
        className={cx(
          "mt-1 text-2xl font-bold tracking-tight",
          highlight ? "text-brand-800" : "text-neutral-900"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cx("mt-1 text-xs", highlight ? "text-brand-600/80" : "text-neutral-400")}>
          {sub}
        </p>
      )}
    </Link>
  );
}

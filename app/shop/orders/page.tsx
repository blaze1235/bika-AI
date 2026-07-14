import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ViewToggleLinks, type ViewMode } from "@/components/view-toggle";
import { cx } from "@/lib/cx";
import { money, formatDateTime } from "@/lib/format";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireRole("BUYER");
  const { view: viewParam } = await searchParams;
  const view: ViewMode = viewParam === "grid" ? "grid" : "list";

  const orders = await prisma.order.findMany({
    where: { buyerId: session.userId },
    orderBy: { number: "desc" },
    include: {
      distributor: { select: { businessName: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Мои заказы
        </h1>
        {orders.length > 0 && (
          <ViewToggleLinks view={view} hrefList="/shop/orders?view=list" hrefGrid="/shop/orders?view=grid" />
        )}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="Заказов пока нет"
          text="Оформите первый заказ из каталога — история появится здесь"
          action={
            <Link
              href="/shop/catalog"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-on-primary hover:bg-brand-700"
            >
              Открыть каталог
            </Link>
          }
        />
      ) : (
        <div className={cx(view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3")}>
          {orders.map((o) => (
            <Link key={o.id} href={`/shop/orders/${o.id}`} className="block">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      Заказ №{o.number}
                    </p>
                    <p className="truncate text-xs text-neutral-400">
                      {o.distributor.businessName ?? o.distributor.name} ·{" "}
                      {formatDateTime(o.createdAt)} · {o._count.items} поз.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-bold text-neutral-900">
                      {money(o.total)}
                    </span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

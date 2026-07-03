import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { money, formatDateTime } from "@/lib/format";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage() {
  const session = await requireRole("BUYER");

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
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-neutral-900">
        Мои заказы
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="Заказов пока нет"
          text="Оформите первый заказ из каталога — история появится здесь"
          action={
            <Link
              href="/shop/catalog"
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Открыть каталог
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
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

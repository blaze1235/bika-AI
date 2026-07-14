import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/portal-shell";
import { Card, EmptyState } from "@/components/ui";
import { ViewToggleLinks, type ViewMode } from "@/components/view-toggle";
import { money, formatDate } from "@/lib/format";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Buyers of this distributor — derived from order history
 * (everyone who has placed at least one order).
 */
export default async function DistributorBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireRole("DISTRIBUTOR");
  const { view: viewParam } = await searchParams;
  const view: ViewMode = viewParam === "grid" ? "grid" : "list";

  const grouped = await prisma.order.groupBy({
    by: ["buyerId"],
    where: { distributorId: session.userId },
    _count: true,
    _sum: { total: true },
    _max: { createdAt: true },
  });

  const buyers = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.buyerId) } },
    select: { id: true, name: true, businessName: true, phone: true, address: true },
  });

  const rows = grouped
    .map((g) => {
      const buyer = buyers.find((b) => b.id === g.buyerId);
      return buyer
        ? {
            ...buyer,
            orderCount: g._count,
            total: g._sum.total ?? 0,
            lastOrder: g._max.createdAt,
          }
        : null;
    })
    .filter((r) => r !== null)
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader
        title="Ваши покупатели"
        text="Магазины и заведения, которые заказывали у вас"
        action={
          rows.length > 0 && (
            <ViewToggleLinks view={view} hrefList="/distributor/buyers?view=list" hrefGrid="/distributor/buyers?view=grid" />
          )
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Store size={40} />}
          title="Покупателей пока нет"
          text="Здесь появятся магазины, которые сделают заказ на ваши товары"
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <p className="font-medium text-neutral-900">{r.businessName ?? r.name}</p>
              <p className="text-xs text-neutral-400">
                {r.name}
                {r.address ? ` · ${r.address}` : ""}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                <span className="text-neutral-500">{r.phone ?? "—"}</span>
                <span className="font-mono font-semibold text-neutral-900">{money(r.total)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                <span>{r.orderCount} заказ(ов)</span>
                <span>{r.lastOrder ? formatDate(r.lastOrder) : "—"}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="scroll-x">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-medium">Покупатель</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
                <th className="px-4 py-3 font-medium">Заказов</th>
                <th className="px-4 py-3 font-medium">Сумма покупок</th>
                <th className="px-4 py-3 font-medium">Последний заказ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">
                      {r.businessName ?? r.name}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {r.name}
                      {r.address ? ` · ${r.address}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">{r.orderCount}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {money(r.total)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {r.lastOrder ? formatDate(r.lastOrder) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

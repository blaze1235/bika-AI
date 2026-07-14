import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { money, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";
import { ShoppingCart } from "lucide-react";

export type OrderListRow = {
  id: string;
  number: number;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  itemCount: number;
  buyerLabel?: string;
  distributorLabel?: string;
};

/**
 * Server-rendered orders table. `hrefBase` controls where a row links
 * (e.g. /admin/orders, /distributor/orders).
 */
export function OrdersTable({
  orders,
  hrefBase,
  showBuyer,
  showDistributor,
}: {
  orders: OrderListRow[];
  hrefBase: string;
  showBuyer?: boolean;
  showDistributor?: boolean;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={40} />}
        title="Заказов пока нет"
        text="Как только появятся заказы, они будут показаны здесь"
      />
    );
  }

  return (
    <Card className="scroll-x">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-3 font-medium">Заказ</th>
            {showBuyer && <th className="px-4 py-3 font-medium">Покупатель</th>}
            {showDistributor && <th className="px-4 py-3 font-medium">Дистрибьютор</th>}
            <th className="px-4 py-3 font-medium">Дата</th>
            <th className="px-4 py-3 font-medium">Сумма</th>
            <th className="px-4 py-3 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {orders.map((o) => (
            <tr key={o.id} className="group relative hover:bg-neutral-50/60">
              <td className="px-4 py-3">
                <Link
                  href={`${hrefBase}/${o.id}`}
                  className="font-medium text-neutral-900 after:absolute after:inset-0"
                >
                  №{o.number}
                </Link>
                <p className="text-xs text-neutral-400">{o.itemCount} поз.</p>
              </td>
              {showBuyer && (
                <td className="px-4 py-3 text-neutral-600">{o.buyerLabel}</td>
              )}
              {showDistributor && (
                <td className="px-4 py-3 text-neutral-600">{o.distributorLabel}</td>
              )}
              <td className="px-4 py-3 text-neutral-500">
                {formatDateTime(o.createdAt)}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900">
                {money(o.total)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/** Card-grid alternative to the table, for dense visual scanning. */
export function OrdersGrid({
  orders,
  hrefBase,
  showBuyer,
  showDistributor,
}: {
  orders: OrderListRow[];
  hrefBase: string;
  showBuyer?: boolean;
  showDistributor?: boolean;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={40} />}
        title="Заказов пока нет"
        text="Как только появятся заказы, они будут показаны здесь"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((o) => (
        <Link key={o.id} href={`${hrefBase}/${o.id}`} className="block">
          <Card className="p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">№{o.number}</p>
                <p className="text-xs text-neutral-400">{o.itemCount} поз.</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            {(showBuyer || showDistributor) && (
              <p className="mt-2 truncate text-sm text-neutral-600">
                {showBuyer && o.buyerLabel}
                {showBuyer && showDistributor && " → "}
                {showDistributor && o.distributorLabel}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-xs text-neutral-400">{formatDateTime(o.createdAt)}</span>
              <span className="font-mono text-sm font-semibold text-neutral-900">
                {money(o.total)}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/** Status filter chips (server-rendered links, ?status= param). */
export function StatusFilter({
  current,
  basePath,
}: {
  current?: string;
  basePath: string;
}) {
  const options: Array<{ value: string; label: string }> = [
    { value: "", label: "Все" },
    { value: "PENDING", label: "Новые" },
    { value: "CONFIRMED", label: "Подтверждённые" },
    { value: "SHIPPED", label: "Отправленные" },
    { value: "DELIVERED", label: "Доставленные" },
    { value: "CANCELLED", label: "Отменённые" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = (current ?? "") === opt.value;
        return (
          <Link
            key={opt.value}
            href={opt.value ? `${basePath}?status=${opt.value}` : basePath}
            className={
              active
                ? "rounded-full bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
            }
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}

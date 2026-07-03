import Link from "next/link";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { OrderStatusControl } from "@/components/order-status-control";
import { money, formatDateTime, UNIT_LABELS } from "@/lib/format";
import type { Order, OrderItem, User } from "@prisma/client";
import { ArrowLeft } from "lucide-react";

type OrderWithRelations = Order & {
  items: OrderItem[];
  buyer: Pick<User, "name" | "businessName" | "phone" | "address" | "username">;
  distributor: Pick<User, "name" | "businessName" | "phone">;
};

/**
 * Full order view shared by all three portals.
 * `canManage` shows the status action buttons (distributor / admin).
 */
export function OrderDetail({
  order,
  backHref,
  backLabel,
  canManage,
  showBuyer,
  showDistributor,
}: {
  order: OrderWithRelations;
  backHref: string;
  backLabel: string;
  canManage?: boolean;
  showBuyer?: boolean;
  showDistributor?: boolean;
}) {
  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Заказ №{order.number}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <ul className="divide-y divide-neutral-50">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {item.productName}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {money(item.price)} × {item.quantity} {UNIT_LABELS[item.unit]}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-neutral-900">
                    {money(item.subtotal)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
              <p className="text-sm font-semibold text-neutral-900">Итого</p>
              <p className="text-lg font-bold text-neutral-900">{money(order.total)}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {canManage && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">
                Управление статусом
              </h2>
              <OrderStatusControl orderId={order.id} status={order.status} />
              {order.status === "DELIVERED" && (
                <p className="text-sm text-emerald-600">Заказ доставлен ✓</p>
              )}
              {order.status === "CANCELLED" && (
                <p className="text-sm text-neutral-400">Заказ отменён</p>
              )}
            </Card>
          )}

          {showBuyer && (
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">Покупатель</h2>
              <InfoRow label="Название" value={order.buyer.businessName ?? order.buyer.name} />
              <InfoRow label="Контакт" value={order.buyer.name} />
              <InfoRow label="Телефон" value={order.buyer.phone ?? "—"} />
            </Card>
          )}

          {showDistributor && (
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">Дистрибьютор</h2>
              <InfoRow
                label="Название"
                value={order.distributor.businessName ?? order.distributor.name}
              />
              <InfoRow label="Телефон" value={order.distributor.phone ?? "—"} />
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">Доставка</h2>
            <InfoRow label="Адрес" value={order.deliveryAddress} />
            {order.notes && <InfoRow label="Комментарий" value={order.notes} />}
          </Card>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-sm text-neutral-800">{value}</p>
    </div>
  );
}

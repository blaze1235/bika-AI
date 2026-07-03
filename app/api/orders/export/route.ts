import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, toCsv, csvResponse } from "@/lib/api";
import { STATUS_LABELS, UNIT_LABELS } from "@/lib/format";

/**
 * CSV export of orders (one row per order item).
 * Admin exports everything; distributor only their own orders.
 */
export const GET = apiHandler(async () => {
  const session = await requireRole("ADMIN", "DISTRIBUTOR");

  const orders = await prisma.order.findMany({
    where:
      session.role === "DISTRIBUTOR"
        ? { distributorId: session.userId }
        : undefined,
    include: {
      items: true,
      buyer: { select: { name: true, businessName: true, username: true } },
      distributor: { select: { businessName: true, name: true } },
    },
    orderBy: { number: "desc" },
  });

  const rows: (string | number)[][] = [];
  for (const o of orders) {
    for (const item of o.items) {
      rows.push([
        o.number,
        new Date(o.createdAt).toLocaleString("ru-RU"),
        STATUS_LABELS[o.status],
        o.buyer.businessName ?? o.buyer.name,
        o.distributor.businessName ?? o.distributor.name,
        item.productName,
        UNIT_LABELS[item.unit],
        item.price,
        item.quantity,
        item.subtotal,
        o.total,
        o.deliveryAddress,
        o.notes ?? "",
      ]);
    }
  }

  const csv = toCsv(
    [
      "№ заказа",
      "Дата",
      "Статус",
      "Покупатель",
      "Дистрибьютор",
      "Товар",
      "Ед.",
      "Цена",
      "Кол-во",
      "Сумма позиции",
      "Итого заказа",
      "Адрес доставки",
      "Комментарий",
    ],
    rows
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`bika-orders-${stamp}.csv`, csv);
});

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { apiHandler, badRequest } from "@/lib/api";

type CartItem = { productId: string; quantity: number };

/**
 * Buyer checkout. The cart may contain products from several distributors —
 * we split it into one order per distributor. Prices are re-read from the
 * database (never trusted from the client).
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireRole("BUYER");
  const body = await request.json().catch(() => null);

  const items: CartItem[] = Array.isArray(body?.items) ? body.items : [];
  const deliveryAddress = String(body?.deliveryAddress ?? "").trim();
  const notes = String(body?.notes ?? "").trim() || null;

  if (items.length === 0) return badRequest("Корзина пуста");
  if (!deliveryAddress) return badRequest("Укажите адрес доставки");

  // Validate quantities
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) {
      return badRequest("Неверное количество товара");
    }
  }

  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true, distributor: { active: true } },
  });

  if (products.length !== new Set(ids).size) {
    return badRequest(
      "Некоторые товары больше недоступны. Обновите корзину и попробуйте снова."
    );
  }

  // Check stock where it is tracked
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId)!;
    if (p.stock !== null && item.quantity > p.stock) {
      return badRequest(`Недостаточно на складе: «${p.name}» (доступно ${p.stock})`);
    }
  }

  // Group items per distributor -> one order each
  const byDistributor = new Map<string, CartItem[]>();
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId)!;
    const list = byDistributor.get(p.distributorId) ?? [];
    list.push(item);
    byDistributor.set(p.distributorId, list);
  }

  const orderIds = await prisma.$transaction(async (tx) => {
    const created: string[] = [];
    for (const [distributorId, distItems] of byDistributor) {
      const orderItems = distItems.map((item) => {
        const p = products.find((x) => x.id === item.productId)!;
        return {
          productId: p.id,
          productName: p.name,
          unit: p.unit,
          price: p.price,
          quantity: item.quantity,
          subtotal: p.price * item.quantity,
        };
      });
      const total = orderItems.reduce((s, i) => s + i.subtotal, 0);

      const order = await tx.order.create({
        data: {
          buyerId: session.userId,
          distributorId,
          deliveryAddress,
          notes,
          total,
          items: { create: orderItems },
        },
      });

      // Decrement tracked stock
      for (const item of distItems) {
        const p = products.find((x) => x.id === item.productId)!;
        if (p.stock !== null) {
          await tx.product.update({
            where: { id: p.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      created.push(order.id);
    }
    return created;
  });

  await logActivity(
    session.userId,
    session.username,
    "Создан заказ",
    `${orderIds.length} заказ(а), ${items.length} позиций`
  );

  return NextResponse.json({ orderIds }, { status: 201 });
});

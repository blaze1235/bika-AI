import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ProductCard, type CatalogProduct } from "@/components/product-card";
import { money, formatDate, formatDateTime } from "@/lib/format";
import { ArrowRight, Sparkles, History } from "lucide-react";

export const dynamic = "force-dynamic";

/** Orders needed before Bika considers patterns "learned". */
const LEARNING_TARGET = 10;
/** Orders needed before showing the recommendation list. */
const MIN_ORDERS_FOR_SUGGESTIONS = 3;

export default async function ShopHome() {
  const session = await requireRole("BUYER");
  const buyerId = session.userId;

  const [user, orderCount, spent, lastOrder, frequentItems] = await Promise.all([
    prisma.user.findUnique({
      where: { id: buyerId },
      select: { name: true, businessName: true },
    }),
    prisma.order.count({ where: { buyerId, status: { not: "CANCELLED" } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { buyerId, status: { not: "CANCELLED" } },
    }),
    prisma.order.findFirst({
      where: { buyerId },
      orderBy: { createdAt: "desc" },
      include: { items: true, distributor: { select: { businessName: true, name: true } } },
    }),
    // Frequently ordered products across all non-cancelled orders
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { buyerId, status: { not: "CANCELLED" } },
        productId: { not: null },
      },
      _sum: { quantity: true },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: 8,
    }),
  ]);

  // Resolve frequent items to live products (available ones only)
  const frequentIds = frequentItems
    .map((f) => f.productId)
    .filter((id): id is string => id !== null);
  const suggestedProducts =
    frequentIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: { in: frequentIds },
            active: true,
            distributor: { active: true },
          },
          include: {
            category: { select: { name: true } },
            distributor: { select: { id: true, businessName: true, name: true } },
          },
        })
      : [];
  // Keep frequency order, top 5
  const suggestions: CatalogProduct[] = frequentIds
    .map((id) => suggestedProducts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      unit: p.unit,
      imageUrl: p.imageUrl,
      stock: p.stock,
      distributorId: p.distributor.id,
      distributorName: p.distributor.businessName ?? p.distributor.name,
      categoryName: p.category?.name ?? null,
    }));

  const learningProgress = Math.min(orderCount, LEARNING_TARGET);
  const greeting = user?.businessName ?? user?.name ?? "";

  return (
    <>
      {/* Greeting + quick stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Здравствуйте{greeting ? `, ${greeting}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Заказывайте у своих дистрибьюторов в пару кликов
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-neutral-400">Всего заказов</p>
          <p className="mt-1 text-xl font-bold text-neutral-900">{orderCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-400">Сумма покупок</p>
          <p className="mt-1 text-xl font-bold text-neutral-900">
            {money(spent._sum.total ?? 0)}
          </p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-xs text-neutral-400">Последний заказ</p>
          {lastOrder ? (
            <Link href={`/shop/orders/${lastOrder.id}`} className="mt-1 block">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  №{lastOrder.number} · {money(lastOrder.total)}
                </span>
                <StatusBadge status={lastOrder.status} />
              </span>
              <span className="text-xs text-neutral-400">
                {formatDateTime(lastOrder.createdAt)}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-sm text-neutral-400">Ещё не было</p>
          )}
        </Card>
      </div>

      {/* Bika learning progress */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-white">
            <Sparkles size={18} />
            <h2 className="text-sm font-semibold">Подсказки Bika</h2>
          </div>
          {orderCount < LEARNING_TARGET ? (
            <>
              <p className="mt-2 text-sm text-brand-100">
                Bika изучает ваши заказы, чтобы напоминать о нужных товарах
                ({learningProgress}/{LEARNING_TARGET} заказов)
              </p>
              <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white/90 transition-all"
                  style={{ width: `${(learningProgress / LEARNING_TARGET) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-brand-100">
              Bika знает ваши привычки — вот что вам может понадобиться
            </p>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {orderCount === 0 && (
            <div className="text-center">
              <p className="text-sm text-neutral-500">
                Сделайте первый заказ — и Bika начнёт запоминать, что вы покупаете.
              </p>
              <Link
                href="/shop/catalog"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Открыть каталог
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {orderCount > 0 && orderCount < MIN_ORDERS_FOR_SUGGESTIONS && lastOrder && (
            <div>
              <p className="flex items-center gap-2 text-sm text-neutral-600">
                <History size={16} className="text-brand-600" />
                В прошлый раз ({formatDate(lastOrder.createdAt)}) вы заказывали:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-500">
                {lastOrder.items.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    • {item.productName} — {item.quantity} ед.
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-neutral-400">
                Ещё {MIN_ORDERS_FOR_SUGGESTIONS - orderCount} заказ(а) — и Bika начнёт
                составлять для вас персональные рекомендации.
              </p>
            </div>
          )}

          {orderCount >= MIN_ORDERS_FOR_SUGGESTIONS && suggestions.length > 0 && (
            <>
              <p className="mb-3 text-sm text-neutral-600">
                Судя по вашим заказам, вам может понадобиться:
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {suggestions.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {lastOrder && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
                  <History size={14} />
                  Последний заказ был {formatDate(lastOrder.createdAt)} у{" "}
                  {lastOrder.distributor.businessName ?? lastOrder.distributor.name}
                </p>
              )}
            </>
          )}

          {orderCount >= MIN_ORDERS_FOR_SUGGESTIONS && suggestions.length === 0 && (
            <p className="text-sm text-neutral-400">
              Товары из ваших прошлых заказов сейчас недоступны. Загляните в каталог!
            </p>
          )}
        </div>
      </Card>

      {/* Catalog CTA */}
      <Link
        href="/shop/catalog"
        className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-neutral-950/5 shadow-sm transition-shadow hover:shadow-md"
      >
        <div>
          <p className="text-sm font-semibold text-neutral-900">Каталог товаров</p>
          <p className="text-xs text-neutral-400">
            Все товары ваших дистрибьюторов с поиском и фильтрами
          </p>
        </div>
        <ArrowRight size={20} className="text-brand-600" />
      </Link>
    </>
  );
}

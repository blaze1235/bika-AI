import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ProductCard, type CatalogProduct } from "@/components/product-card";
import { RepeatOrderButton, type RepeatItem } from "@/components/repeat-order";
import { money, formatDate, formatDateTime, UNIT_LABELS } from "@/lib/format";
import { ArrowRight, Sparkles, History, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

/** Orders needed before Bika considers patterns "learned". */
const LEARNING_TARGET = 10;
/** Orders needed before showing the recommendation list. */
const MIN_ORDERS_FOR_SUGGESTIONS = 3;

const CATEGORY_EMOJI: Record<string, string> = {
  "Напитки": "🥤",
  "Молочные продукты": "🥛",
  "Бакалея": "🌾",
  "Снеки": "🍿",
  "Бытовая химия": "🧼",
  "Кондитерские изделия": "🍪",
};

export default async function ShopHome() {
  const session = await requireRole("BUYER");
  const buyerId = session.userId;

  const [user, orderCount, spent, lastOrder, frequentItems, categories] =
    await Promise.all([
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
        include: {
          items: true,
          distributor: { select: { businessName: true, name: true } },
        },
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
      prisma.category.findMany({
        orderBy: { name: "asc" },
        where: { products: { some: { active: true, distributor: { active: true } } } },
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

  // Live products for the last order → one-tap reorder
  let repeatItems: RepeatItem[] = [];
  if (lastOrder) {
    const ids = lastOrder.items
      .map((i) => i.productId)
      .filter((id): id is string => id !== null);
    if (ids.length > 0) {
      const live = await prisma.product.findMany({
        where: { id: { in: ids }, active: true, distributor: { active: true } },
        include: {
          distributor: { select: { id: true, businessName: true, name: true } },
        },
      });
      repeatItems = lastOrder.items.flatMap((item) => {
        const p = live.find((x) => x.id === item.productId);
        if (!p) return [];
        return [
          {
            product: {
              productId: p.id,
              name: p.name,
              price: p.price,
              unit: UNIT_LABELS[p.unit],
              imageUrl: p.imageUrl,
              distributorId: p.distributor.id,
              distributorName: p.distributor.businessName ?? p.distributor.name,
              stock: p.stock,
            },
            qty: item.quantity,
          },
        ];
      });
    }
  }

  const learningProgress = Math.min(orderCount, LEARNING_TARGET);
  const greeting = user?.businessName ?? user?.name ?? "";

  return (
    <>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Здравствуйте{greeting ? `, ${greeting}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Заказывайте у своих дистрибьюторов в пару кликов
        </p>
      </div>

      {/* Compact stat strip */}
      <Card className="mb-5 grid grid-cols-3 divide-x divide-neutral-100">
        <div className="px-4 py-3">
          <p className="text-xs text-neutral-400">Всего заказов</p>
          <p className="mt-0.5 text-lg font-bold text-neutral-900">{orderCount}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-neutral-400">Сумма покупок</p>
          <p className="mt-0.5 text-sm font-bold leading-6 text-neutral-900 sm:text-lg">
            {money(spent._sum.total ?? 0)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-neutral-400">Последний заказ</p>
          {lastOrder ? (
            <Link
              href={`/shop/orders/${lastOrder.id}`}
              className="mt-0.5 flex flex-wrap items-center gap-1.5"
            >
              <span className="text-lg font-bold text-neutral-900">
                №{lastOrder.number}
              </span>
              <StatusBadge status={lastOrder.status} />
            </Link>
          ) : (
            <p className="mt-0.5 text-sm text-neutral-400">Ещё не было</p>
          )}
        </div>
      </Card>

      {/* One-tap reorder */}
      {lastOrder && repeatItems.length > 0 && (
        <Card className="mb-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <RotateCcw size={15} className="text-brand-600" />
                Заказать как в прошлый раз
              </p>
              <p className="mt-1 truncate text-xs text-neutral-400">
                №{lastOrder.number} от {formatDateTime(lastOrder.createdAt)} ·{" "}
                {lastOrder.items.length} поз. · {money(lastOrder.total)}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                {lastOrder.items.map((i) => i.productName).join(", ")}
              </p>
            </div>
            <RepeatOrderButton items={repeatItems} />
          </div>
        </Card>
      )}

      {/* Category quick tiles */}
      {categories.length > 0 && (
        <div className="mb-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Категории</h2>
            <Link
              href="/shop/catalog"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Весь каталог →
            </Link>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <div className="flex w-max gap-2.5">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/shop/catalog?category=${c.id}`}
                  className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-3 text-center ring-1 ring-brand-950/5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl">
                    {CATEGORY_EMOJI[c.name] ?? "🧺"}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight text-neutral-700">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

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
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:from-brand-600 hover:to-brand-700"
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
        className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-brand-950/5 shadow-sm transition-all hover:shadow-md hover:ring-brand-200"
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

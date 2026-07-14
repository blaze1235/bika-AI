import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { RepeatOrderButton, type RepeatItem } from "@/components/repeat-order";
import { HomeSearch } from "./home-search";
import { money, formatDateTime, UNIT_LABELS } from "@/lib/format";
import { ArrowRight, Sparkles, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

const LEARNING_TARGET = 10;

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

  const [user, orderCount, lastOrder, categories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: buyerId },
      select: { name: true, businessName: true },
    }),
    prisma.order.count({ where: { buyerId, status: { not: "CANCELLED" } } }),
    prisma.order.findFirst({
      where: { buyerId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        distributor: { select: { businessName: true, name: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      where: { products: { some: { active: true, distributor: { active: true } } } },
    }),
  ]);

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

  const greeting = user?.businessName ?? user?.name ?? "";
  const learning = orderCount < LEARNING_TARGET;

  return (
    <>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Здравствуйте{greeting ? `, ${greeting}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted">
          Заказывайте у своих дистрибьюторов в пару кликов
        </p>
      </div>

      <div className="mb-5">
        <HomeSearch />
      </div>

      {/* AI banner */}
      <Link
        href="/shop/ai"
        className="mb-5 block overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-on-primary shadow-lg shadow-brand-600/30 transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-90">
          <Sparkles size={13} /> Bika AI
        </div>
        <p className="mt-1.5 text-base font-bold leading-snug">
          {orderCount === 0
            ? "Сделайте первый заказ — Bika начнёт учиться"
            : learning
            ? `Bika изучает ваши заказы (${orderCount}/${LEARNING_TARGET})`
            : "Ваши персональные подсказки готовы"}
        </p>
        <p className="mt-0.5 text-sm opacity-85">Нажмите, чтобы посмотреть →</p>
      </Link>

      {/* Compact stat strip */}
      <Card className="mb-5 grid grid-cols-2 divide-x divide-border">
        <div className="px-4 py-3">
          <p className="text-xs text-muted">Всего заказов</p>
          <p className="mt-0.5 font-mono text-lg font-bold text-text">{orderCount}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted">Последний заказ</p>
          {lastOrder ? (
            <Link
              href={`/shop/orders/${lastOrder.id}`}
              className="mt-0.5 flex flex-wrap items-center gap-1.5"
            >
              <span className="font-mono text-lg font-bold text-text">
                №{lastOrder.number}
              </span>
              <StatusBadge status={lastOrder.status} />
            </Link>
          ) : (
            <p className="mt-0.5 text-sm text-faint">Ещё не было</p>
          )}
        </div>
      </Card>

      {/* One-tap reorder */}
      {lastOrder && repeatItems.length > 0 && (
        <Card className="mb-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-text">
                <RotateCcw size={15} className="text-brand-600" />
                Заказать как в прошлый раз
              </p>
              <p className="mt-1 truncate text-xs text-faint">
                №{lastOrder.number} от {formatDateTime(lastOrder.createdAt)} ·{" "}
                {lastOrder.items.length} поз. · {money(lastOrder.total)}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-muted">
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
            <h2 className="text-sm font-semibold text-text">Категории</h2>
            <Link
              href="/shop/catalog"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
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
                  className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-center shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-xl">
                    {CATEGORY_EMOJI[c.name] ?? "🧺"}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight text-text">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catalog CTA */}
      <Link
        href="/shop/catalog"
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-lg)]"
      >
        <div>
          <p className="text-sm font-semibold text-text">Каталог товаров</p>
          <p className="text-xs text-faint">
            Все товары ваших дистрибьюторов с поиском и фильтрами
          </p>
        </div>
        <ArrowRight size={20} className="text-brand-600" />
      </Link>
    </>
  );
}

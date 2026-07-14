import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { RepeatOrderButton, type RepeatItem } from "@/components/repeat-order";
import { HomeBrowse } from "@/components/home-browse";
import type { CatalogProduct } from "@/components/product-card";
import { money, formatDateTime, UNIT_LABELS } from "@/lib/format";
import { ArrowRight, Sparkles, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

const LEARNING_TARGET = 10;
const BROWSE_LIMIT = 40;

export default async function ShopHome() {
  const session = await requireRole("BUYER");
  const buyerId = session.userId;

  const [user, orderCount, lastOrder, categories, popular] = await Promise.all([
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
    // Platform-wide best sellers, to open Home with genuinely popular items
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { not: "CANCELLED" } } },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: BROWSE_LIMIT,
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

  // Popular products first (real order-volume ranking), topped up with the
  // newest active products so Home never looks sparse for a fresh platform.
  const popularIds = popular.map((p) => p.productId).filter((id): id is string => id !== null);
  const popularProducts =
    popularIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: popularIds }, active: true, distributor: { active: true } },
          include: {
            category: { select: { name: true } },
            distributor: { select: { id: true, businessName: true, name: true } },
          },
        })
      : [];
  const seen = new Set(popularProducts.map((p) => p.id));
  const fillCount = BROWSE_LIMIT - popularProducts.length;
  const fillProducts =
    fillCount > 0
      ? await prisma.product.findMany({
          where: { id: { notIn: [...seen] }, active: true, distributor: { active: true } },
          orderBy: { createdAt: "desc" },
          take: fillCount,
          include: {
            category: { select: { name: true } },
            distributor: { select: { id: true, businessName: true, name: true } },
          },
        })
      : [];
  const browseProducts: CatalogProduct[] = [...popularProducts, ...fillProducts].map((p) => ({
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

      <HomeBrowse categories={categories} products={browseProducts}>
        {/* AI banner — same slot position as the design's Home screen */}
        <Link
          href="/shop/ai"
          className="mt-4 block overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-on-primary shadow-lg shadow-brand-600/30 transition-transform hover:-translate-y-0.5"
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
      </HomeBrowse>

      {/* Compact stat strip */}
      <Card className="mb-5 mt-6 grid grid-cols-2 divide-x divide-border">
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

      {/* Catalog CTA */}
      <Link
        href="/shop/catalog"
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-lg)]"
      >
        <div>
          <p className="text-sm font-semibold text-text">Каталог товаров</p>
          <p className="text-xs text-faint">
            Полный поиск и фильтры по всем дистрибьюторам
          </p>
        </div>
        <ArrowRight size={20} className="text-brand-600" />
      </Link>
    </>
  );
}

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { AddOneButton, AddAllButton, type WeeklyItem } from "@/components/ai-actions";
import { RepeatOrderButton, type RepeatItem } from "@/components/repeat-order";
import { ProductThumb } from "@/components/products-manager";
import { money, UNIT_LABELS, formatDate } from "@/lib/format";
import Link from "next/link";
import { Sparkles, TrendingDown, TrendingUp, RotateCcw, PackageX } from "lucide-react";

export const dynamic = "force-dynamic";

const LEARNING_TARGET = 10;
const MIN_ORDERS_FOR_INSIGHTS = 3;

export default async function AiAssistantPage() {
  const session = await requireRole("BUYER");
  const buyerId = session.userId;

  const [orderCount, orderDates, lastOrder, frequentItems, thisMonth, lastMonth] =
    await Promise.all([
      prisma.order.count({ where: { buyerId, status: { not: "CANCELLED" } } }),
      prisma.order.findMany({
        where: { buyerId, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.order.findFirst({
        where: { buyerId },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: { buyerId, status: { not: "CANCELLED" } },
          productId: { not: null },
        },
        _sum: { quantity: true },
        _count: true,
        orderBy: { _count: { productId: "desc" } },
        take: 6,
      }),
      monthTotal(buyerId, 0),
      monthTotal(buyerId, 1),
    ]);

  // Average days between consecutive orders
  let avgCycleDays: number | null = null;
  if (orderDates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < orderDates.length; i++) {
      const days =
        (orderDates[i].createdAt.getTime() - orderDates[i - 1].createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(days);
    }
    avgCycleDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }
  const daysSinceLast = lastOrder
    ? Math.floor((Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const frequentIds = frequentItems
    .map((f) => f.productId)
    .filter((id): id is string => id !== null);
  const lastOrderProductIds = (lastOrder?.items ?? [])
    .map((i) => i.productId)
    .filter((id): id is string => id !== null);
  const allNeededIds = Array.from(new Set([...frequentIds, ...lastOrderProductIds]));
  const liveProducts =
    allNeededIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allNeededIds }, active: true, distributor: { active: true } },
          include: {
            distributor: { select: { id: true, businessName: true, name: true } },
          },
        })
      : [];

  const repeatItems: RepeatItem[] = (lastOrder?.items ?? []).flatMap((item) => {
    const p = liveProducts.find((x) => x.id === item.productId);
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

  const weekly: WeeklyItem[] = frequentItems
    .map((f) => {
      const p = liveProducts.find((x) => x.id === f.productId);
      if (!p) return null;
      const avgQty = Math.max(1, Math.round((f._sum.quantity ?? 0) / f._count));
      return {
        qty: avgQty,
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
      };
    })
    .filter((x): x is WeeklyItem => x !== null)
    .slice(0, 5);
  const weeklyTotal = weekly.reduce((s, w) => s + w.product.price * w.qty, 0);

  // Forgotten item: most-ordered product missing from the last order
  const lastOrderIds = new Set(
    (lastOrder?.items ?? []).map((i) => i.productId).filter(Boolean)
  );
  const forgotten = weekly.find((w) => !lastOrderIds.has(w.product.productId));

  const spentThis = thisMonth ?? 0;
  const spentLast = lastMonth ?? 0;
  const spendDeltaPct =
    spentLast > 0 ? Math.round(((spentThis - spentLast) / spentLast) * 100) : null;

  const learning = orderCount < LEARNING_TARGET;

  return (
    <>
      <div className="mb-1 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-on-primary shadow-md shadow-brand-600/30">
          <Sparkles size={19} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text">Bika AI</h1>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
            {learning ? "Учится на ваших заказах" : "Знает ваши привычки"}
          </p>
        </div>
      </div>

      {orderCount === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-muted">
            Сделайте первый заказ — и Bika начнёт подмечать закономерности в ваших
            покупках, чтобы подсказывать нужные товары.
          </p>
          <Link
            href="/shop/catalog"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-on-primary hover:bg-brand-700"
          >
            Открыть каталог
          </Link>
        </Card>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {orderCount < MIN_ORDERS_FOR_INSIGHTS
              ? `Ещё ${MIN_ORDERS_FOR_INSIGHTS - orderCount} заказ(а) — и здесь появятся персональные подсказки на основе истории.`
              : `На основе ${orderCount} ваших заказов — вот что заметила Bika.`}
          </p>

          {orderCount >= MIN_ORDERS_FOR_INSIGHTS && (
            <div className="mt-4 flex flex-col gap-3">
              {avgCycleDays !== null && avgCycleDays >= 1 && lastOrder && daysSinceLast !== null && (
                <Card className="p-4">
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                      <RotateCcw size={16} className="text-brand-600" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug text-text">
                        Обычно вы заказываете каждые ~{Math.round(avgCycleDays)} дн.
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Последний заказ был {daysSinceLast} дн. назад, {formatDate(lastOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                  {daysSinceLast >= Math.round(avgCycleDays) - 1 && repeatItems.length > 0 && (
                    <div className="mt-3">
                      <RepeatOrderButton items={repeatItems} />
                    </div>
                  )}
                </Card>
              )}

              {forgotten && (
                <Card className="p-4">
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warn-soft">
                      <PackageX size={16} className="text-warn" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug text-text">
                        Вы обычно заказываете «{forgotten.product.name}» —
                        его нет в последнем заказе
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {money(forgotten.product.price)} / {forgotten.product.unit}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <AddOneButton product={forgotten.product} qty={forgotten.qty} />
                  </div>
                </Card>
              )}

              {spendDeltaPct !== null && (
                <InsightCard
                  glyph={
                    spendDeltaPct <= 0 ? (
                      <TrendingDown size={16} className="text-brand-600" />
                    ) : (
                      <TrendingUp size={16} className="text-warn" />
                    )
                  }
                  title={
                    spendDeltaPct <= 0
                      ? `В этом месяце вы потратили на ${Math.abs(spendDeltaPct)}% меньше`
                      : `В этом месяце вы потратили на ${spendDeltaPct}% больше`
                  }
                  sub={`${money(spentThis)} в этом месяце против ${money(spentLast)} в прошлом`}
                />
              )}
            </div>
          )}

          {weekly.length > 0 && (
            <div className="mt-5 rounded-2xl border border-brand-200/60 bg-gradient-to-b from-primary-soft/60 to-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-extrabold text-text">Рекомендуемый заказ</p>
                <span className="rounded-lg bg-primary-soft px-2 py-1 font-mono text-xs font-bold text-brand-700">
                  {weekly.length} товар(ов)
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {weekly.map((w) => (
                  <div key={w.product.productId} className="flex items-center gap-3">
                    <ProductThumb
                      name={w.product.name}
                      imageUrl={w.product.imageUrl}
                      size={36}
                      rounded="rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text">
                        {w.qty}× {w.product.name}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-muted">
                      {money(w.product.price * w.qty)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <AddAllButton items={weekly} label={`Добавить всё в корзину · ${money(weeklyTotal)}`} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function InsightCard({
  glyph,
  title,
  sub,
}: {
  glyph: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-text">{title}</p>
          <p className="mt-0.5 text-xs text-muted">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

async function monthTotal(buyerId: string, monthsAgo: number): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  const result = await prisma.order.aggregate({
    _sum: { total: true },
    where: {
      buyerId,
      status: { not: "CANCELLED" },
      createdAt: { gte: start, lt: end },
    },
  });
  return result._sum.total ?? 0;
}

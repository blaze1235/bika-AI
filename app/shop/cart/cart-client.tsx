"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-context";
import { ProductThumb } from "@/components/products-manager";
import {
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { money } from "@/lib/format";
import { CheckCircle2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

export function CartClient({ defaultAddress }: { defaultAddress: string }) {
  const router = useRouter();
  const { items, total, setQty, remove, clear, add } = useCart();
  const [address, setAddress] = useState(defaultAddress);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<number | null>(null);

  // Group by distributor so the buyer sees the order will be split
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: typeof items }>();
    for (const item of items) {
      const g = map.get(item.distributorId) ?? { name: item.distributorName, items: [] };
      g.items.push(item);
      map.set(item.distributorId, g);
    }
    return Array.from(map.values());
  }, [items]);

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
          deliveryAddress: address,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось оформить заказ");
        return;
      }
      setPlaced(data.orderIds.length);
      clear();
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (placed !== null) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Заказ оформлен!</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {placed > 1
            ? `Создано ${placed} заказа — по одному для каждого дистрибьютора.`
            : "Дистрибьютор получил ваш заказ и скоро подтвердит его."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/shop/orders"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-on-primary hover:bg-brand-700"
          >
            Мои заказы
          </Link>
          <Link
            href="/shop/catalog"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            В каталог
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-neutral-900">
          Корзина
        </h1>
        <EmptyState
          icon={<ShoppingCart size={40} />}
          title="Корзина пуста"
          text="Добавьте товары из каталога, чтобы оформить заказ"
          action={
            <Link
              href="/shop/catalog"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-on-primary hover:bg-brand-700"
            >
              Открыть каталог
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-neutral-900">
        Корзина
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {groups.map((group) => (
            <Card key={group.name}>
              <p className="border-b border-neutral-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {group.name}
              </p>
              <ul className="divide-y divide-neutral-50">
                {group.items.map((item) => (
                  <li key={item.productId} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <ProductThumb name={item.name} imageUrl={item.imageUrl} size={44} />
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {money(item.price)} / {item.unit}
                        </p>
                      </div>

                      <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg bg-neutral-50 px-1 py-0.5 ring-1 ring-neutral-200">
                          <button
                            onClick={() => setQty(item.productId, item.qty - 1)}
                            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 cursor-pointer"
                            aria-label="Убавить"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-7 text-center text-sm font-semibold">
                            {item.qty}
                          </span>
                          <button
                            onClick={() =>
                              (item.stock === null || item.qty < item.stock) &&
                              add(item, 1)
                            }
                            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 cursor-pointer"
                            aria-label="Добавить"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <p className="min-w-20 text-right font-mono text-sm font-semibold text-neutral-900">
                          {money(item.price * item.qty)}
                        </p>
                        <button
                          onClick={() => remove(item.productId)}
                          className="rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                          aria-label="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Checkout */}
        <div>
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              Оформление заказа
            </h2>
            <form onSubmit={checkout} className="space-y-4">
              <Field label="Адрес доставки">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Город, улица, дом"
                  required
                />
              </Field>
              <Field label="Комментарий к заказу">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Например: привезите до обеда"
                />
              </Field>

              <div className="space-y-1 border-t border-neutral-100 pt-3 text-sm">
                <div className="flex justify-between text-neutral-500">
                  <span>Позиций</span>
                  <span>{items.length}</span>
                </div>
                {groups.length > 1 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Дистрибьюторов</span>
                    <span>{groups.length}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-bold text-neutral-900">
                  <span>Итого</span>
                  <span className="font-mono">{money(total)}</span>
                </div>
              </div>

              {groups.length > 1 && (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                  Товары от {groups.length} дистрибьюторов — будет создано{" "}
                  {groups.length} отдельных заказа.
                </p>
              )}

              <ErrorText>{error}</ErrorText>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Оформляем..." : "Оформить заказ"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, type CartItem } from "@/components/cart-context";
import { Check, Plus } from "lucide-react";
import { cx } from "@/lib/cx";

export type SingleProduct = Omit<CartItem, "qty">;
export type WeeklyItem = { product: SingleProduct; qty: number };

/** Insight-card CTA: adds one product, then shows a checked "added" state. */
export function AddOneButton({
  product,
  qty = 1,
  label = "Добавить в заказ",
}: {
  product: SingleProduct;
  qty?: number;
  label?: string;
}) {
  const { add, qtyOf } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const added = justAdded || qtyOf(product.productId) > 0;

  return (
    <button
      onClick={() => {
        add(product, qty);
        setJustAdded(true);
      }}
      disabled={added}
      className={cx(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors cursor-pointer disabled:cursor-default",
        added
          ? "bg-primary-soft text-brand-700"
          : "bg-brand-600 text-on-primary hover:bg-brand-700"
      )}
    >
      {added ? <Check size={15} /> : <Plus size={15} />}
      {added ? "Добавлено" : label}
    </button>
  );
}

/** Adds every item of a recommended weekly order, then opens the cart. */
export function AddAllButton({
  items,
  label,
}: {
  items: WeeklyItem[];
  label: string;
}) {
  const { add, setQty, qtyOf } = useCart();
  const router = useRouter();

  function addAll() {
    for (const { product, qty } of items) {
      const current = qtyOf(product.productId);
      const target = Math.max(current, qty);
      const capped =
        product.stock !== null ? Math.min(target, product.stock) : target;
      if (capped <= 0) continue;
      if (current > 0) setQty(product.productId, capped);
      else add(product, capped);
    }
    router.push("/shop/cart");
  }

  return (
    <button
      onClick={addAll}
      className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-extrabold text-on-primary shadow-md shadow-brand-600/30 transition-colors hover:bg-brand-700 cursor-pointer"
    >
      {label}
    </button>
  );
}

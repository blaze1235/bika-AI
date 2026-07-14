"use client";

import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/components/cart-context";
import { RotateCcw } from "lucide-react";

export type RepeatItem = {
  product: Omit<CartItem, "qty">;
  qty: number;
};

/**
 * One-tap reorder: puts every still-available item of the last order
 * into the cart (topping up to the previous quantity) and opens the cart.
 */
export function RepeatOrderButton({ items }: { items: RepeatItem[] }) {
  const { add, setQty, qtyOf } = useCart();
  const router = useRouter();

  if (items.length === 0) return null;

  function repeat() {
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
      onClick={repeat}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-on-primary shadow-md shadow-brand-600/25 transition-all hover:bg-brand-700 cursor-pointer"
    >
      <RotateCcw size={15} />
      Повторить заказ
    </button>
  );
}

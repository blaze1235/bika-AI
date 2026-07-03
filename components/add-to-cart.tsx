"use client";

import { useCart } from "@/components/cart-context";
import { cx } from "@/lib/cx";
import { Minus, Plus, ShoppingCart } from "lucide-react";

export type CartProduct = {
  productId: string;
  name: string;
  price: number;
  unit: string;
  imageUrl: string | null;
  distributorId: string;
  distributorName: string;
  stock: number | null;
};

/**
 * "Add to cart" button that turns into a quantity stepper once the
 * product is in the cart. Used on catalog cards, product page and
 * suggestion cards.
 */
export function AddToCart({
  product,
  size = "md",
}: {
  product: CartProduct;
  size?: "md" | "lg";
}) {
  const { add, setQty, qtyOf } = useCart();
  const qty = qtyOf(product.productId);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const atLimit = product.stock !== null && qty >= product.stock;

  if (outOfStock) {
    return (
      <span
        className={cx(
          "inline-flex w-full items-center justify-center rounded-lg bg-neutral-100 font-medium text-neutral-400",
          size === "lg" ? "px-5 py-2.5 text-base" : "px-3 py-2 text-sm"
        )}
      >
        Нет в наличии
      </span>
    );
  }

  if (qty === 0) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          add(product);
        }}
        className={cx(
          "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 font-medium text-white transition-colors hover:bg-brand-800 cursor-pointer",
          size === "lg" ? "px-5 py-2.5 text-base" : "px-3 py-2 text-sm"
        )}
      >
        <ShoppingCart size={size === "lg" ? 18 : 15} />
        В корзину
      </button>
    );
  }

  return (
    <div
      className={cx(
        "flex w-full items-center justify-between rounded-lg bg-brand-50 ring-1 ring-brand-200",
        size === "lg" ? "px-2 py-1.5" : "px-1.5 py-1"
      )}
      onClick={(e) => e.preventDefault()}
    >
      <StepBtn onClick={() => setQty(product.productId, qty - 1)} label="Убавить">
        <Minus size={16} />
      </StepBtn>
      <span className="min-w-8 text-center text-sm font-semibold text-brand-900">
        {qty}
      </span>
      <StepBtn
        onClick={() => !atLimit && add(product)}
        label="Добавить"
        disabled={atLimit}
      >
        <Plus size={16} />
      </StepBtn>
    </div>
  );
}

function StepBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="rounded-md p-1.5 text-brand-700 hover:bg-brand-100 disabled:opacity-40 cursor-pointer"
    >
      {children}
    </button>
  );
}

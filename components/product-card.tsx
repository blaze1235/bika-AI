import Link from "next/link";
import { AddToCart, type CartProduct } from "@/components/add-to-cart";
import { ProductThumb } from "@/components/products-manager";
import { money, UNIT_LABELS } from "@/lib/format";
import type { Unit } from "@prisma/client";

export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  unit: Unit;
  imageUrl: string | null;
  stock: number | null;
  distributorId: string;
  distributorName: string;
  categoryName: string | null;
};

function toCartProduct(product: CatalogProduct): CartProduct {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    unit: UNIT_LABELS[product.unit],
    imageUrl: product.imageUrl,
    distributorId: product.distributorId,
    distributorName: product.distributorName,
    stock: product.stock,
  };
}

/**
 * Dense catalog list row: thumbnail, name/distributor, price and an
 * inline stepper. Optimised for fast repeat B2B ordering.
 */
export function ProductRow({ product }: { product: CatalogProduct }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-brand-950/5 shadow-sm shadow-brand-950/[0.04] transition-all hover:shadow-md hover:ring-brand-200">
      <Link
        href={`/shop/product/${product.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <ProductThumb
          name={product.name}
          imageUrl={product.imageUrl}
          size={56}
          rounded="rounded-xl"
        />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
            {product.name}
          </p>
          <p className="truncate text-xs text-neutral-400">
            {product.distributorName} · за {UNIT_LABELS[product.unit]}
          </p>
          <p className="mt-0.5 text-sm font-bold text-brand-800">
            {money(product.price)}
          </p>
        </div>
      </Link>
      <div className="w-30 shrink-0 sm:w-36">
        <AddToCart product={toCartProduct(product)} />
      </div>
    </div>
  );
}

/** Catalog grid card: image, name, price, add-to-cart. */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const cartProduct = toCartProduct(product);

  return (
    <div className="group flex flex-col rounded-2xl bg-white p-3 ring-1 ring-brand-950/5 shadow-sm shadow-brand-950/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/10 hover:ring-brand-200">
      <Link href={`/shop/product/${product.id}`} className="flex flex-1 flex-col">
        <div className="mb-3 flex justify-center">
          <ProductThumb
            name={product.name}
            imageUrl={product.imageUrl}
            size={112}
            rounded="rounded-lg"
          />
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">
          {product.distributorName} · за {UNIT_LABELS[product.unit]}
        </p>
        <p className="mb-3 mt-auto pt-2 text-base font-bold text-brand-800">
          {money(product.price)}
        </p>
      </Link>
      <AddToCart product={cartProduct} />
    </div>
  );
}

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

/** Catalog grid card: image, name, price, add-to-cart. */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const cartProduct: CartProduct = {
    productId: product.id,
    name: product.name,
    price: product.price,
    unit: UNIT_LABELS[product.unit],
    imageUrl: product.imageUrl,
    distributorId: product.distributorId,
    distributorName: product.distributorName,
    stock: product.stock,
  };

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

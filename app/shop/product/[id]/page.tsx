import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { AddToCart } from "@/components/add-to-cart";
import { ProductThumb } from "@/components/products-manager";
import { money, UNIT_LABELS } from "@/lib/format";
import { ArrowLeft, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("BUYER");
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      distributor: { select: { id: true, businessName: true, name: true, phone: true, active: true } },
    },
  });
  if (!product || !product.active || !product.distributor.active) notFound();

  const distributorName =
    product.distributor.businessName ?? product.distributor.name;

  return (
    <>
      <Link
        href="/shop/catalog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft size={16} />
        Каталог
      </Link>

      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:p-7">
          <div className="flex justify-center sm:justify-start">
            <ProductThumb
              name={product.name}
              imageUrl={product.imageUrl}
              size={200}
              rounded="rounded-xl"
            />
          </div>

          <div className="flex flex-col">
            {product.category && (
              <div className="mb-2">
                <Badge className="bg-neutral-50 text-neutral-600 ring-neutral-500/15">
                  {product.category.name}
                </Badge>
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {product.description}
              </p>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-sm text-neutral-500">
              <Truck size={15} className="text-brand-600" />
              {distributorName}
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">
                {money(product.price)}
              </span>
              <span className="text-sm text-neutral-400">
                за {UNIT_LABELS[product.unit]}
              </span>
            </div>

            {product.stock !== null && (
              <p className="mt-1 text-xs text-neutral-400">
                {product.stock > 0 ? `В наличии: ${product.stock}` : "Нет в наличии"}
              </p>
            )}

            <div className="mt-5 max-w-xs">
              <AddToCart
                size="lg"
                product={{
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  unit: UNIT_LABELS[product.unit],
                  imageUrl: product.imageUrl,
                  distributorId: product.distributor.id,
                  distributorName,
                  stock: product.stock,
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

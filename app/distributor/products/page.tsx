import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ProductsManager } from "@/components/products-manager";

export const dynamic = "force-dynamic";

export default async function DistributorProductsPage() {
  const session = await requireRole("DISTRIBUTOR");

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { distributorId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <ProductsManager
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        unit: p.unit,
        stock: p.stock,
        imageUrl: p.imageUrl,
        active: p.active,
        categoryId: p.category?.id ?? null,
        categoryName: p.category?.name ?? null,
        distributorId: p.distributorId,
        distributorName: "",
      }))}
      categories={categories}
    />
  );
}

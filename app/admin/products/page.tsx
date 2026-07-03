import { prisma } from "@/lib/db";
import { ProductsManager } from "@/components/products-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories, distributors] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        distributor: { select: { id: true, businessName: true, name: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "DISTRIBUTOR" },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true, name: true },
    }),
  ]);

  return (
    <ProductsManager
      isAdmin
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
        distributorName: p.distributor.businessName ?? p.distributor.name,
      }))}
      categories={categories}
      distributors={distributors.map((d) => ({
        id: d.id,
        label: d.businessName ?? d.name,
      }))}
    />
  );
}

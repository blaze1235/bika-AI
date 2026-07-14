import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { EmptyState} from "@/components/ui";
import { cx } from "@/lib/cx";
import { ProductRow } from "@/components/product-card";
import { CatalogSearch } from "./catalog-search";
import { PackageSearch } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Buyer catalog: search + category chips + distributor filter,
 * all driven by URL params so results are server-rendered.
 */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; distributor?: string }>;
}) {
  await requireRole("BUYER");
  const { q, category, distributor } = await searchParams;

  const [products, categories, distributors] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        distributor: { active: true },
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { categoryId: category } : {}),
        ...(distributor ? { distributorId: distributor } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        distributor: { select: { id: true, businessName: true, name: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      where: { products: { some: { active: true } } },
    }),
    prisma.user.findMany({
      where: { role: "DISTRIBUTOR", active: true, products: { some: { active: true } } },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true, name: true },
    }),
  ]);

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, category, distributor, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/shop/catalog?${qs}` : "/shop/catalog";
  };

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-neutral-900">
        Каталог
      </h1>

      <CatalogSearch
        initialQuery={q ?? ""}
        distributors={distributors.map((d) => ({
          id: d.id,
          label: d.businessName ?? d.name,
        }))}
        currentDistributor={distributor ?? ""}
        currentCategory={category ?? ""}
      />

      {/* Category chips */}
      <div className="-mx-4 mb-5 mt-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <CategoryChip href={buildHref({ category: undefined })} active={!category}>
            Все
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              href={buildHref({ category: c.id })}
              active={category === c.id}
            >
              {c.name}
            </CategoryChip>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={40} />}
          title="Ничего не найдено"
          text="Попробуйте изменить запрос или сбросить фильтры"
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                price: p.price,
                unit: p.unit,
                imageUrl: p.imageUrl,
                stock: p.stock,
                distributorId: p.distributor.id,
                distributorName: p.distributor.businessName ?? p.distributor.name,
                categoryName: p.category?.name ?? null,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-on-primary"
          : "bg-card text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
      )}
    >
      {children}
    </Link>
  );
}

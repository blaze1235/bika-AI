"use client";

import { useMemo, useState } from "react";
import { ProductCard, type CatalogProduct } from "@/components/product-card";
import { Search } from "lucide-react";

const CATEGORY_EMOJI: Record<string, string> = {
  "Напитки": "🥤",
  "Молочные продукты": "🥛",
  "Бакалея": "🌾",
  "Снеки": "🍿",
  "Бытовая химия": "🧼",
  "Кондитерские изделия": "🍪",
};

/**
 * Home screen browse experience — live search + category filter over an
 * in-page product grid, mirroring the design's Home screen (search box,
 * category chips, product grid with inline qty steppers all update
 * instantly, no navigation).
 */
export function HomeBrowse({
  categories,
  products,
  children,
}: {
  categories: { id: string; name: string }[];
  products: CatalogProduct[];
  children?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.categoryName !== activeCategory) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.distributorName.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [products, search, activeCategory]);

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 shadow-[var(--shadow-card)]">
        <Search size={18} className="text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Найти товар..."
          className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint"
        />
      </div>

      {children}

      {/* Category chips */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <CategoryChip active={activeCategory === ""} onClick={() => setActiveCategory("")}>
            Все
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              active={activeCategory === c.name}
              onClick={() => setActiveCategory(c.name)}
            >
              <span className="mr-1">{CATEGORY_EMOJI[c.name] ?? "🧺"}</span>
              {c.name}
            </CategoryChip>
          ))}
        </div>
      </div>

      {/* Heading + count */}
      <div className="mb-3 mt-5 flex items-baseline justify-between">
        <h2 className="text-base font-extrabold tracking-tight text-text">
          {activeCategory || "Популярные товары"}
        </h2>
        <span className="font-mono text-xs text-muted">
          {filtered.length} {pluralItems(filtered.length)}
        </span>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center text-sm text-faint">
          Ничего не найдено
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function pluralItems(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "товара";
  return "товаров";
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-none whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer " +
        (active
          ? "bg-brand-600 text-on-primary"
          : "border border-border bg-card text-text hover:bg-card-2")
      }
    >
      {children}
    </button>
  );
}

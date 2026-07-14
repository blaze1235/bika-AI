"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/portal-shell";
import { Badge, Button, Card, EmptyState, Input, Select} from "@/components/ui";
import { cx } from "@/lib/cx";
import {
  ProductFormModal,
  emptyProduct,
  type ProductFormData,
} from "@/components/product-form";
import { money, UNIT_LABELS } from "@/lib/format";
import type { Unit } from "@prisma/client";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: Unit;
  stock: number | null;
  imageUrl: string | null;
  active: boolean;
  categoryId: string | null;
  categoryName: string | null;
  distributorId: string;
  distributorName: string;
};

/**
 * Product management table shared by the distributor portal and the
 * admin panel (admin additionally sees/filters by distributor).
 */
export function ProductsManager({
  products,
  categories,
  distributors,
  isAdmin,
}: {
  products: ProductRow[];
  categories: { id: string; name: string }[];
  distributors?: { id: string; label: string }[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [distFilter, setDistFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductFormData>(emptyProduct);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (distFilter && p.distributorId !== distFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, distFilter]);

  function openCreate() {
    setEditing({ ...emptyProduct, distributorId: distFilter || undefined });
    setModalOpen(true);
  }

  function openEdit(p: ProductRow) {
    setEditing({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      unit: p.unit,
      stock: p.stock ?? "",
      imageUrl: p.imageUrl ?? "",
      categoryId: p.categoryId ?? "",
      active: p.active,
      distributorId: p.distributorId,
    });
    setModalOpen(true);
  }

  async function remove(p: ProductRow) {
    if (!confirm(`Удалить товар «${p.name}»?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Ошибка удаления");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Товары"
        text={
          isAdmin
            ? "Все товары платформы по дистрибьюторам"
            : "Ваш каталог: добавляйте и редактируйте товары"
        }
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Добавить товар
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="pl-9"
          />
        </div>
        {isAdmin && distributors && (
          <Select
            value={distFilter}
            onChange={(e) => setDistFilter(e.target.value)}
            className="w-auto"
          >
            <option value="">Все дистрибьюторы</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title="Товаров нет"
          text="Добавьте первый товар, чтобы покупатели увидели его в каталоге"
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Добавить товар
            </Button>
          }
        />
      ) : (
        <Card className="scroll-x">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-medium">Товар</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Дистрибьютор</th>}
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Остаток</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {visible.map((p) => (
                <tr key={p.id} className={cx(!p.active && "opacity-45")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb name={p.name} imageUrl={p.imageUrl} size={40} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900">{p.name}</p>
                        <p className="truncate text-xs text-neutral-400">
                          {UNIT_LABELS[p.unit]}
                          {!p.active && " · скрыт"}
                        </p>
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-neutral-500">{p.distributorName}</td>
                  )}
                  <td className="px-4 py-3">
                    {p.categoryName ? (
                      <Badge className="bg-neutral-50 text-neutral-600 ring-neutral-500/15">
                        {p.categoryName}
                      </Badge>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {money(p.price)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {p.stock === null ? (
                      "—"
                    ) : p.stock === 0 ? (
                      <span className="text-red-500 font-medium">нет</span>
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Изменить"
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title="Удалить"
                        onClick={() => remove(p)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        categories={categories}
        distributors={isAdmin ? distributors : undefined}
      />
    </>
  );
}

/** Product image with a letter placeholder fallback. */
export function ProductThumb({
  name,
  imageUrl,
  size = 40,
  rounded = "rounded-lg",
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
  rounded?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={cx("shrink-0 object-cover bg-neutral-100", rounded)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center border border-border-2 bg-card-2 font-mono font-semibold text-brand-600",
        rounded
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

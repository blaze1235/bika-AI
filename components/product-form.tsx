"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  ErrorText,
} from "@/components/ui";
import { UNIT_LABELS } from "@/lib/format";
import type { Unit } from "@prisma/client";

export type ProductFormData = {
  id?: string;
  name: string;
  description: string;
  price: number | "";
  unit: Unit;
  stock: number | "";
  imageUrl: string;
  categoryId: string;
  active: boolean;
  distributorId?: string;
};

export const emptyProduct: ProductFormData = {
  name: "",
  description: "",
  price: "",
  unit: "PIECE",
  stock: "",
  imageUrl: "",
  categoryId: "",
  active: true,
};

/**
 * Create/edit product modal, shared by the distributor portal and admin.
 * When `distributors` is passed (admin), a distributor picker is shown.
 */
export function ProductFormModal({
  open,
  onClose,
  initial,
  categories,
  distributors,
}: {
  open: boolean;
  onClose: () => void;
  initial: ProductFormData;
  categories: { id: string; name: string }[];
  distributors?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Re-sync when a different product is opened
  const [lastKey, setLastKey] = useState(initial.id ?? "new");
  const key = initial.id ?? "new";
  if (key !== lastKey) {
    setLastKey(key);
    setForm(initial);
    setError("");
  }

  const set = (patch: Partial<ProductFormData>) =>
    setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        price: form.price === "" ? 0 : Number(form.price),
        stock: form.stock === "" ? null : Number(form.stock),
      };
      const res = await fetch(
        form.id ? `/api/products/${form.id}` : "/api/products",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка сохранения");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? "Изменить товар" : "Новый товар"}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        {distributors && (
          <Field label="Дистрибьютор">
            <Select
              value={form.distributorId ?? ""}
              onChange={(e) => set({ distributorId: e.target.value })}
              required
              disabled={Boolean(form.id)}
            >
              <option value="">— выберите —</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Название">
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Например: Молоко 1л (упак. 12 шт)"
            required
          />
        </Field>

        <Field label="Описание">
          <Textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={2}
            placeholder="Коротко о товаре"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Цена (сум)">
            <Input
              type="number"
              min={1}
              value={form.price}
              onChange={(e) =>
                set({ price: e.target.value === "" ? "" : Number(e.target.value) })
              }
              placeholder="0"
              required
            />
          </Field>
          <Field label="Единица">
            <Select
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value as Unit })}
            >
              {Object.entries(UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Остаток на складе" hint="Оставьте пустым, если не отслеживаете">
            <Input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) =>
                set({ stock: e.target.value === "" ? "" : Number(e.target.value) })
              }
              placeholder="—"
            />
          </Field>
          <Field label="Категория">
            <Select
              value={form.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
            >
              <option value="">Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Ссылка на фото" hint="Вставьте URL изображения (необязательно)">
          <Input
            type="url"
            value={form.imageUrl}
            onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set({ active: e.target.checked })}
            className="h-4 w-4 rounded border-neutral-300 accent-teal-700"
          />
          Товар активен (виден покупателям)
        </label>

        <ErrorText>{error}</ErrorText>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Сохраняем..." : "Сохранить"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

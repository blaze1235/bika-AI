"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/portal-shell";
import { Button, Card, ErrorText, Input } from "@/components/ui";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Cat = { id: string; name: string; productCount: number };

export function CategoriesClient({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Ошибка");
      return;
    }
    setNewName("");
    router.refresh();
  }

  async function rename(id: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Ошибка");
      return;
    }
    setEditingId(null);
    setError("");
    router.refresh();
  }

  async function remove(cat: Cat) {
    if (
      !confirm(
        `Удалить категорию «${cat.name}»? Товары останутся, но потеряют категорию.`
      )
    )
      return;
    await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Категории"
        text="Общие категории товаров для всей платформы"
      />

      <Card className="mb-4 p-4">
        <form onSubmit={create} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название новой категории"
            required
          />
          <Button type="submit" disabled={busy} className="shrink-0">
            <Plus size={16} />
            Добавить
          </Button>
        </form>
        {error && <div className="mt-2"><ErrorText>{error}</ErrorText></div>}
      </Card>

      <Card>
        <ul className="divide-y divide-neutral-50">
          {categories.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-neutral-400">
              Категорий пока нет
            </li>
          )}
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === c.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="max-w-xs"
                    autoFocus
                  />
                  <button
                    onClick={() => rename(c.id)}
                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                    title="Сохранить"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                    title="Отмена"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    {c.name}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {c.productCount} тов.
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                    title="Переименовать"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

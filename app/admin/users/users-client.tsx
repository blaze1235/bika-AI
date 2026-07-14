"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/portal-shell";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Field,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { ViewToggleButtons } from "@/components/view-toggle-buttons";
import type { ViewMode } from "@/components/view-toggle";
import { cx } from "@/lib/cx";
import { ROLE_LABELS, formatDate } from "@/lib/format";
import type { Role } from "@prisma/client";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";

const VIEW_STORAGE_KEY = "bika_view_users";

type UserRow = {
  id: string;
  username: string;
  role: Role;
  name: string;
  businessName: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  orders: number;
  products: number;
};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: "bg-neutral-900 text-white ring-neutral-900",
  DISTRIBUTOR: "bg-blue-50 text-blue-700 ring-blue-600/20",
  BUYER: "bg-brand-50 text-brand-700 ring-brand-600/20",
};

type FormState = {
  id?: string;
  username: string;
  password: string;
  role: Role;
  name: string;
  businessName: string;
  phone: string;
  address: string;
};

const emptyForm: FormState = {
  username: "",
  password: "",
  role: "BUYER",
  name: "",
  businessName: "",
  phone: "",
  address: "",
};

export function UsersClient({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Role | "ALL">("ALL");
  const [modal, setModal] = useState<null | "create" | "edit" | "password">(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  function changeView(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  }

  const visible = filter === "ALL" ? users : users.filter((u) => u.role === filter);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setModal("create");
  }

  function openEdit(u: UserRow) {
    setForm({
      id: u.id,
      username: u.username,
      password: "",
      role: u.role,
      name: u.name,
      businessName: u.businessName ?? "",
      phone: u.phone ?? "",
      address: u.address ?? "",
    });
    setError("");
    setModal("edit");
  }

  function openPassword(u: UserRow) {
    setForm({ ...emptyForm, id: u.id, username: u.username, password: "" });
    setError("");
    setModal("password");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const isCreate = modal === "create";
      const url = isCreate ? "/api/admin/users" : `/api/admin/users/${form.id}`;
      const payload =
        modal === "password"
          ? { password: form.password }
          : {
              username: form.username,
              password: form.password || undefined,
              role: form.role,
              name: form.name,
              businessName: form.businessName,
              phone: form.phone,
              address: form.address,
            };
      const res = await fetch(url, {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      setModal(null);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: UserRow) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    router.refresh();
  }

  async function remove(u: UserRow) {
    if (
      !confirm(
        `Удалить пользователя «${u.username}»? Его заказы и товары будут удалены. Это действие необратимо.`
      )
    )
      return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
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
        title="Пользователи"
        text="Создание аккаунтов с паролями, редактирование и блокировка"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Новый пользователь
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "BUYER", "DISTRIBUTOR", "ADMIN"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-sm font-medium cursor-pointer transition-colors",
                filter === r
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
              )}
            >
              {r === "ALL" ? "Все" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <ViewToggleButtons view={view} onChange={changeView} />
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((u) => (
            <Card key={u.id} className={cx("p-4", !u.active && "opacity-50")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">
                    {u.businessName ?? u.name}
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    @{u.username}
                    {u.businessName ? ` · ${u.name}` : ""}
                  </p>
                </div>
                <Badge className={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                <span>{u.phone ?? "—"}</span>
                <span>
                  {u.role === "DISTRIBUTOR"
                    ? `${u.products} тов. · ${u.orders} зак.`
                    : u.role === "BUYER"
                      ? `${u.orders} зак.`
                      : "—"}
                </span>
              </div>
              <div className="mt-1 text-xs text-neutral-400">
                Создан {formatDate(u.createdAt)}
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <IconBtn title="Изменить" onClick={() => openEdit(u)}>
                  <Pencil size={16} />
                </IconBtn>
                <IconBtn title="Сбросить пароль" onClick={() => openPassword(u)}>
                  <KeyRound size={16} />
                </IconBtn>
                <button
                  title={u.active ? "Заблокировать" : "Разблокировать"}
                  onClick={() => toggleActive(u)}
                  className={cx(
                    "rounded-lg px-2 py-1 text-xs font-medium cursor-pointer",
                    u.active
                      ? "text-amber-600 hover:bg-amber-50"
                      : "text-emerald-600 hover:bg-emerald-50"
                  )}
                >
                  {u.active ? "Блок" : "Вкл"}
                </button>
                <IconBtn title="Удалить" onClick={() => remove(u)} danger>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
            </Card>
          ))}
        </div>
      ) : (
      <Card className="scroll-x">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3 font-medium">Пользователь</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Телефон</th>
              <th className="px-4 py-3 font-medium">Активность</th>
              <th className="px-4 py-3 font-medium">Создан</th>
              <th className="px-4 py-3 font-medium text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {visible.map((u) => (
              <tr key={u.id} className={cx(!u.active && "opacity-50")}>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">
                    {u.businessName ?? u.name}
                  </p>
                  <p className="text-xs text-neutral-400">
                    @{u.username}
                    {u.businessName ? ` · ${u.name}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge className={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                </td>
                <td className="px-4 py-3 text-neutral-500">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {u.role === "DISTRIBUTOR"
                    ? `${u.products} тов. · ${u.orders} зак.`
                    : u.role === "BUYER"
                      ? `${u.orders} зак.`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconBtn title="Изменить" onClick={() => openEdit(u)}>
                      <Pencil size={16} />
                    </IconBtn>
                    <IconBtn title="Сбросить пароль" onClick={() => openPassword(u)}>
                      <KeyRound size={16} />
                    </IconBtn>
                    <button
                      title={u.active ? "Заблокировать" : "Разблокировать"}
                      onClick={() => toggleActive(u)}
                      className={cx(
                        "rounded-lg px-2 py-1 text-xs font-medium cursor-pointer",
                        u.active
                          ? "text-amber-600 hover:bg-amber-50"
                          : "text-emerald-600 hover:bg-emerald-50"
                      )}
                    >
                      {u.active ? "Блок" : "Вкл"}
                    </button>
                    <IconBtn title="Удалить" onClick={() => remove(u)} danger>
                      <Trash2 size={16} />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      )}

      {/* Create / Edit */}
      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Новый пользователь" : "Изменить пользователя"}
        wide
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Логин" hint="Латиница, без пробелов">
              <Input
                value={form.username}
                onChange={(e) => set({ username: e.target.value })}
                disabled={modal === "edit"}
                placeholder="magazin-lola"
                required
              />
            </Field>
            <Field
              label={modal === "create" ? "Пароль" : "Новый пароль"}
              hint={modal === "edit" ? "Оставьте пустым, чтобы не менять" : "Минимум 6 символов"}
            >
              <Input
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                placeholder="••••••"
                required={modal === "create"}
              />
            </Field>
          </div>

          {modal === "create" && (
            <Field label="Роль">
              <Select
                value={form.role}
                onChange={(e) => set({ role: e.target.value as Role })}
              >
                <option value="BUYER">Покупатель (магазин / HoReCa)</option>
                <option value="DISTRIBUTOR">Дистрибьютор</option>
                <option value="ADMIN">Администратор</option>
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Контактное лицо">
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Имя Фамилия"
                required
              />
            </Field>
            <Field label="Название бизнеса">
              <Input
                value={form.businessName}
                onChange={(e) => set({ businessName: e.target.value })}
                placeholder="Магазин / Компания"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Телефон">
              <Input
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="+998 90 123 45 67"
              />
            </Field>
            <Field label="Адрес">
              <Input
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="Город, улица, дом"
              />
            </Field>
          </div>

          <ErrorText>{error}</ErrorText>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Password reset */}
      <Modal
        open={modal === "password"}
        onClose={() => setModal(null)}
        title={`Сброс пароля — @${form.username}`}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Новый пароль" hint="Минимум 6 символов. Сообщите его пользователю.">
            <Input
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              placeholder="Новый пароль"
              required
              autoFocus
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy}>
              Сбросить пароль
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "rounded-lg p-1.5 cursor-pointer transition-colors",
        danger
          ? "text-neutral-400 hover:bg-red-50 hover:text-red-600"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      )}
    >
      {children}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/portal-shell";
import { Button, Card, ErrorText, Field, Input } from "@/components/ui";
import { PRESET_PALETTES, isValidHex, type Palette } from "@/lib/palette";
import { Check, Plus, Trash2 } from "lucide-react";

type Settings = {
  companyName: string;
  companyPhone: string;
  companyAddress: string;
};

export function SettingsClient({
  initial,
  activePaletteId,
  customPalettes,
}: {
  initial: Settings;
  activePaletteId: string;
  customPalettes: Palette[];
}) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Ошибка сохранения");
        return;
      }
      setSaved(true);
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Настройки" text="Информация о компании и внешний вид" />
      <div className="flex flex-col gap-6">
        <Card className="max-w-lg p-5">
          <form onSubmit={save} className="space-y-4">
            <Field label="Название компании">
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                required
              />
            </Field>
            <Field label="Телефон поддержки">
              <Input
                value={form.companyPhone}
                onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                placeholder="+998 ..."
              />
            </Field>
            <Field label="Адрес">
              <Input
                value={form.companyAddress}
                onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              />
            </Field>

            <ErrorText>{error}</ErrorText>
            {saved && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Сохранено
              </p>
            )}

            <Button type="submit" disabled={busy}>
              {busy ? "Сохраняем..." : "Сохранить"}
            </Button>
          </form>
        </Card>

        <PaletteSettings activeId={activePaletteId} custom={customPalettes} />
      </div>
    </>
  );
}

function PaletteSettings({
  activeId,
  custom,
}: {
  activeId: string;
  custom: Palette[];
}) {
  const router = useRouter();
  const [customList, setCustomList] = useState(custom);
  const [active, setActive] = useState(activeId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [light, setLight] = useState("#147a52");
  const [dark, setDark] = useState("#3fcb8c");
  const [error, setError] = useState("");

  const all = [...PRESET_PALETTES, ...customList];

  async function persist(patch: Record<string, string>) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  }

  async function selectPalette(id: string) {
    setBusyId(id);
    setActive(id);
    const ok = await persist({ palette_active_id: id });
    setBusyId(null);
    if (ok) router.refresh();
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Введите название палитры");
      return;
    }
    if (!isValidHex(light) || !isValidHex(dark)) {
      setError("Цвета должны быть в формате #rrggbb");
      return;
    }
    const palette: Palette = { id: `custom-${Date.now()}`, name: name.trim(), light, dark };
    const nextList = [...customList, palette];
    setBusyId(palette.id);
    const ok = await persist({
      palette_custom: JSON.stringify(nextList),
      palette_active_id: palette.id,
    });
    setBusyId(null);
    if (ok) {
      setCustomList(nextList);
      setActive(palette.id);
      setShowForm(false);
      setName("");
      router.refresh();
    } else {
      setError("Не удалось сохранить палитру");
    }
  }

  async function removeCustom(id: string) {
    const nextList = customList.filter((p) => p.id !== id);
    const nextActive = active === id ? "forest" : active;
    setBusyId(id);
    const ok = await persist({
      palette_custom: JSON.stringify(nextList),
      palette_active_id: nextActive,
    });
    setBusyId(null);
    if (ok) {
      setCustomList(nextList);
      setActive(nextActive);
      router.refresh();
    }
  }

  return (
    <Card className="max-w-2xl p-5">
      <h2 className="text-sm font-semibold text-text">Цветовая палитра сайта</h2>
      <p className="mt-1 text-xs text-muted">
        Основной цвет применяется для всех пользователей платформы в светлой и тёмной теме
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {all.map((p) => {
          const isActive = p.id === active;
          const isCustom = p.id.startsWith("custom-");
          return (
            <div
              key={p.id}
              className={
                "relative flex flex-col gap-2 rounded-xl border p-3 transition-colors " +
                (isActive ? "border-brand-500 bg-primary-soft" : "border-border bg-card hover:border-brand-200")
              }
            >
              <button
                onClick={() => selectPalette(p.id)}
                disabled={busyId === p.id}
                className="flex items-center gap-2 text-left cursor-pointer disabled:opacity-50"
              >
                <span className="flex h-7 w-12 overflow-hidden rounded-lg ring-1 ring-border">
                  <span className="h-full w-1/2" style={{ background: p.light }} />
                  <span className="h-full w-1/2" style={{ background: p.dark }} />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text">
                  {p.name}
                </span>
                {isActive && <Check size={15} className="shrink-0 text-brand-600" />}
              </button>
              {isCustom && (
                <button
                  onClick={() => removeCustom(p.id)}
                  disabled={busyId === p.id}
                  className="absolute right-2 top-2 rounded-md p-1 text-faint hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  title="Удалить палитру"
                  aria-label="Удалить палитру"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 cursor-pointer"
        >
          <Plus size={15} />
          Добавить свою палитру
        </button>
      ) : (
        <form onSubmit={addCustom} className="mt-4 space-y-3 rounded-xl border border-border bg-card-2 p-4">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Бирюза" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Цвет (светлая тема)">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-0.5"
                />
                <Input value={light} onChange={(e) => setLight(e.target.value)} />
              </div>
            </Field>
            <Field label="Цвет (тёмная тема)">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-0.5"
                />
                <Input value={dark} onChange={(e) => setDark(e.target.value)} />
              </div>
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Сохранить и применить
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

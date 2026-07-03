"use client";

import { useState } from "react";
import { PageHeader } from "@/components/portal-shell";
import { Button, Card, ErrorText, Field, Input } from "@/components/ui";

type Settings = {
  companyName: string;
  companyPhone: string;
  companyAddress: string;
};

export function SettingsClient({ initial }: { initial: Settings }) {
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
      <PageHeader title="Настройки" text="Информация о компании" />
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
    </>
  );
}

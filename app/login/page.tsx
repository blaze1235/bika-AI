"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field, ErrorText } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка входа");
        return;
      }
      router.push(data.redirect);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-bg-2 px-4">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
            <span className="h-6 w-6 rounded-full border-[3px] border-on-primary" />
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-text">bika</h1>
          <p className="mt-2 text-sm text-muted">
            Платформа заказов для магазинов и дистрибьюторов
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card-lg)]"
        >
          <Field label="Логин">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ваш логин"
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label="Пароль">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          <ErrorText>{error}</ErrorText>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </Button>

          <p className="text-center text-xs text-faint">
            Нет аккаунта? Обратитесь к администратору Bika.
          </p>
        </form>
      </div>
    </div>
  );
}

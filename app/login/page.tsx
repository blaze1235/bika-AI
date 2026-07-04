"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field, ErrorText } from "@/components/ui";

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-4">
      {/* Warm glow accents */}
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-96 w-96 rounded-full bg-brand-400/15 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-3xl shadow-lg shadow-brand-950/40">
            🧺
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Bika<span className="text-brand-300">.</span>
          </h1>
          <p className="mt-2 text-sm text-brand-100/80">
            Платформа заказов для магазинов и дистрибьюторов
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl bg-white/95 p-6 shadow-2xl shadow-brand-950/40 backdrop-blur"
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

          <p className="text-center text-xs text-neutral-400">
            Нет аккаунта? Обратитесь к администратору Bika.
          </p>
        </form>
      </div>
    </div>
  );
}

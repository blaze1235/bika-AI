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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Bika<span className="text-brand-400">.</span>
          </h1>
          <p className="mt-2 text-sm text-brand-200/70">
            Платформа заказов для магазинов и дистрибьюторов
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-xl"
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

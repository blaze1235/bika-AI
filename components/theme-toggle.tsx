"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cx } from "@/lib/cx";

const STORAGE_KEY = "bika_theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // storage unavailable — theme just won't persist
    }
  }

  return (
    <button
      onClick={toggle}
      title="Сменить тему"
      aria-label="Сменить тему"
      className={cx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-text hover:bg-card-2 cursor-pointer transition-colors",
        className
      )}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

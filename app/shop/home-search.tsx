"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

/** Home search box — submitting routes to the full catalog with the query applied. */
export function HomeSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/shop/catalog?q=${encodeURIComponent(q)}` : "/shop/catalog");
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 shadow-[var(--shadow-card)]"
    >
      <Search size={18} className="text-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Найти товар в каталоге..."
        className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint"
      />
    </form>
  );
}

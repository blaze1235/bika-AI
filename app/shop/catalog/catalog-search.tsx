"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input, Select } from "@/components/ui";
import { Search } from "lucide-react";

/**
 * Debounced search box + distributor select that write to URL params
 * (the catalog page itself is server-rendered).
 */
export function CatalogSearch({
  initialQuery,
  distributors,
  currentDistributor,
  currentCategory,
}: {
  initialQuery: string;
  distributors: { id: string; label: string }[];
  currentDistributor: string;
  currentCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.replace(`/shop/catalog?${params.toString()}`, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setDistributor(id: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (currentCategory) params.set("category", currentCategory);
    if (id) params.set("distributor", id);
    router.replace(`/shop/catalog?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти товар..."
          className="pl-9"
          type="search"
        />
      </div>
      <Select
        value={currentDistributor}
        onChange={(e) => setDistributor(e.target.value)}
        className="sm:w-56"
      >
        <option value="">Все дистрибьюторы</option>
        {distributors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

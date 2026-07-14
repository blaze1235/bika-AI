"use client";

import { LayoutGrid, List } from "lucide-react";
import { cx } from "@/lib/cx";
import type { ViewMode } from "@/components/view-toggle";

const btnBase =
  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer";
const activeCls = "bg-brand-600 text-on-primary";
const inactiveCls = "bg-card text-muted ring-1 ring-border hover:bg-card-2";

/** Local-state driven toggle for already-client components. */
export function ViewToggleButtons({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        onClick={() => onChange("list")}
        aria-label="Список"
        title="Список"
        className={cx(btnBase, view === "list" ? activeCls : inactiveCls)}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Плитка"
        title="Плитка"
        className={cx(btnBase, view === "grid" ? activeCls : inactiveCls)}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

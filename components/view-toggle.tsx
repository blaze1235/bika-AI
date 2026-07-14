import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { cx } from "@/lib/cx";

export type ViewMode = "grid" | "list";

const btnBase =
  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer";
const activeCls = "bg-brand-600 text-on-primary";
const inactiveCls = "bg-card text-muted ring-1 ring-border hover:bg-card-2";

/**
 * URL-param driven toggle for server-rendered pages (?view=grid|list).
 * Plain Links — no client JS needed, so hrefs must be precomputed
 * strings (a function prop can't cross the server/client boundary).
 */
export function ViewToggleLinks({
  view,
  hrefList,
  hrefGrid,
}: {
  view: ViewMode;
  hrefList: string;
  hrefGrid: string;
}) {
  return (
    <div className="flex shrink-0 gap-1.5">
      <Link
        href={hrefList}
        aria-label="Список"
        title="Список"
        className={cx(btnBase, view === "list" ? activeCls : inactiveCls)}
      >
        <List size={16} />
      </Link>
      <Link
        href={hrefGrid}
        aria-label="Плитка"
        title="Плитка"
        className={cx(btnBase, view === "grid" ? activeCls : inactiveCls)}
      >
        <LayoutGrid size={16} />
      </Link>
    </div>
  );
}

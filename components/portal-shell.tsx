"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/cx";

/**
 * Icons are referenced by name because nav items come from server
 * layouts, and component functions cannot cross the server→client
 * boundary in the App Router.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  package: Package,
  cart: ShoppingCart,
  tags: Tags,
  log: ScrollText,
  settings: Settings,
  store: Store,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** match nested routes too */
  exact?: boolean;
};

/**
 * Shared shell for the Admin and Distributor portals:
 * desktop sidebar + mobile top bar with slide-over menu.
 */
export function PortalShell({
  items,
  title,
  subtitle,
  accent = "bg-brand-700",
  children,
}: {
  items: NavItem[];
  title: string;
  subtitle: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item)
                ? "bg-white/15 text-white"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="px-6 pb-6 pt-7">
      <p className="text-xl font-bold tracking-tight text-white">
        Bika<span className="text-brand-300">.</span>
      </p>
      <p className="mt-0.5 truncate text-xs text-white/50">{subtitle}</p>
    </div>
  );

  const logoutBtn = (
    <div className="mt-auto px-3 pb-5">
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <LogOut size={18} />
        Выйти
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside
        className={cx(
          "hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0",
          accent
        )}
      >
        {brand}
        {nav}
        {logoutBtn}
      </aside>

      {/* Mobile top bar */}
      <header
        className={cx(
          "sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden",
          accent
        )}
      >
        <p className="text-lg font-bold text-white">
          Bika<span className="text-brand-300">.</span>{" "}
          <span className="text-sm font-normal text-white/60">{title}</span>
        </p>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          aria-label="Меню"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-950/40"
            onClick={() => setOpen(false)}
          />
          <div className={cx("absolute inset-y-0 left-0 flex w-72 flex-col", accent)}>
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/70"
                aria-label="Закрыть меню"
              >
                <X size={22} />
              </button>
            </div>
            {nav}
            {logoutBtn}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {title}
        </h1>
        {text && <p className="mt-1 text-sm text-neutral-500">{text}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-neutral-950/5 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

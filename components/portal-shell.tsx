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
import { ThemeToggle } from "@/components/theme-toggle";

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
  children,
}: {
  items: NavItem[];
  title: string;
  subtitle: string;
  /** @deprecated kept for call-site compatibility; portal shell no longer uses a solid accent color */
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
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-primary-soft text-brand-800"
                : "text-muted hover:bg-card-2 hover:text-text"
            )}
          >
            <span
              className={cx(
                "h-2 w-2 rounded-[3px]",
                active ? "bg-brand-600" : "bg-border"
              )}
            />
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-6 pb-5 pt-6">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-on-primary shadow-sm shadow-brand-600/40">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-on-primary" />
      </span>
      <div>
        <p className="text-base font-extrabold leading-none tracking-tight text-text">
          bika
        </p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-muted">{title}</p>
      </div>
    </div>
  );

  const businessPanel = (
    <div className="mx-3 mb-3 rounded-xl border border-border bg-card-2 p-3">
      <p className="truncate text-xs font-bold text-text">{subtitle}</p>
    </div>
  );

  const logoutBtn = (
    <div className="px-3 pb-5">
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-card-2 hover:text-text cursor-pointer"
      >
        <LogOut size={18} />
        Выйти
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-card">
        {brand}
        {nav}
        <div className="mt-auto flex flex-col">
          <div className="px-3 pb-2">
            <ThemeToggle className="w-full" />
          </div>
          {businessPanel}
          {logoutBtn}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <p className="flex items-center gap-2 text-base font-extrabold text-text">
          bika
          <span className="text-sm font-normal text-muted">{title}</span>
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle className="h-9 w-9" />
          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 text-text hover:bg-card-2"
            aria-label="Меню"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted"
                aria-label="Закрыть меню"
              >
                <X size={22} />
              </button>
            </div>
            {nav}
            <div className="mt-auto flex flex-col">
              {businessPanel}
              {logoutBtn}
            </div>
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
        <h1 className="text-2xl font-bold tracking-tight text-text">
          {title}
        </h1>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-text">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-faint">{sub}</p>}
    </div>
  );
}

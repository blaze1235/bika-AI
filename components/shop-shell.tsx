"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { cx } from "@/lib/cx";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  ClipboardList,
  Sparkles,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/shop", label: "Главная", icon: Home, exact: true },
  { href: "/shop/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/shop/ai", label: "AI", icon: Sparkles, center: true },
  { href: "/shop/orders", label: "Заказы", icon: ClipboardList },
  { href: "/shop/cart", label: "Корзина", icon: ShoppingCart, cart: true },
];

/**
 * Buyer app shell: sticky top header + bottom tab bar on mobile,
 * top navigation on desktop. Feels like a mobile shopping app.
 */
export function ShopShell({
  children,
  businessName,
}: {
  children: React.ReactNode;
  businessName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/shop" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-text">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-on-primary shadow-sm shadow-brand-600/40">
              <div className="h-2.5 w-2.5 rounded-full border-2 border-on-primary" />
            </span>
            bika
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item)
                      ? "bg-primary-soft text-brand-800"
                      : "text-muted hover:bg-card-2 hover:text-text"
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                  {item.cart && count > 0 && <CartBadge count={count} />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-muted sm:block">
              {businessName}
            </span>
            <ThemeToggle className="hidden md:flex h-9 w-9" />
            {/* Mobile cart shortcut */}
            <Link
              href="/shop/cart"
              className="relative rounded-lg p-2 text-text hover:bg-card-2 md:hidden"
              aria-label="Корзина"
            >
              <ShoppingCart size={21} />
              {count > 0 && <CartBadge count={count} floating />}
            </Link>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-faint hover:bg-card-2 hover:text-text cursor-pointer"
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-7">{children}</main>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5 items-center">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            if (item.center) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold"
                >
                  <span
                    className={cx(
                      "-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg shadow-brand-600/40",
                      active ? "bg-brand-700" : "bg-brand-600"
                    )}
                  >
                    <Icon size={22} className="text-on-primary" />
                  </span>
                  <span className={active ? "text-brand-700" : "text-muted"}>
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-brand-700" : "text-muted"
                )}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.3 : 2} />
                  {item.cart && count > 0 && <CartBadge count={count} floating />}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function CartBadge({ count, floating }: { count: number; floating?: boolean }) {
  return (
    <span
      className={cx(
        "flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-bold text-white",
        floating && "absolute -right-2 -top-1.5"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

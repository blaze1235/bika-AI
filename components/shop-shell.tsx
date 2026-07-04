"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart-context";
import { cx } from "@/lib/cx";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  ClipboardList,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/shop", label: "Главная", icon: Home, exact: true },
  { href: "/shop/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/shop/cart", label: "Корзина", icon: ShoppingCart, cart: true },
  { href: "/shop/orders", label: "Заказы", icon: ClipboardList },
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
    <div className="min-h-dvh pb-20 md:pb-0">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-[#fffcf7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/shop" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-base shadow-sm">
              🧺
            </span>
            Bika<span className="-ml-1 text-brand-500">.</span>
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
                      ? "bg-brand-100 text-brand-900"
                      : "text-neutral-500 hover:bg-brand-50 hover:text-brand-800"
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
            <span className="hidden max-w-40 truncate text-sm text-neutral-500 sm:block">
              {businessName}
            </span>
            {/* Mobile cart shortcut */}
            <Link
              href="/shop/cart"
              className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
              aria-label="Корзина"
            >
              <ShoppingCart size={21} />
              {count > 0 && <CartBadge count={count} floating />}
            </Link>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-[#fffcf7]/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-brand-700" : "text-neutral-400"
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
        "flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white",
        floating && "absolute -right-2 -top-1.5"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

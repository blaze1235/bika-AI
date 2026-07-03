import { PortalShell, type NavItem } from "@/components/portal-shell";

const items: NavItem[] = [
  { href: "/admin", label: "Обзор", icon: "dashboard", exact: true },
  { href: "/admin/users", label: "Пользователи", icon: "users" },
  { href: "/admin/products", label: "Товары", icon: "package" },
  { href: "/admin/orders", label: "Заказы", icon: "cart" },
  { href: "/admin/categories", label: "Категории", icon: "tags" },
  { href: "/admin/activity", label: "Журнал", icon: "log" },
  { href: "/admin/settings", label: "Настройки", icon: "settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      items={items}
      title="Админ"
      subtitle="Панель администратора"
      accent="bg-neutral-900"
    >
      {children}
    </PortalShell>
  );
}

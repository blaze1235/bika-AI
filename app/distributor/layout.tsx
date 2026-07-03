import { PortalShell, type NavItem } from "@/components/portal-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const items: NavItem[] = [
  { href: "/distributor", label: "Обзор", icon: "dashboard", exact: true },
  { href: "/distributor/orders", label: "Заказы", icon: "cart" },
  { href: "/distributor/products", label: "Мои товары", icon: "package" },
  { href: "/distributor/buyers", label: "Покупатели", icon: "store" },
];

export default async function DistributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { businessName: true, name: true },
      })
    : null;

  return (
    <PortalShell
      items={items}
      title="Дистрибьютор"
      subtitle={user?.businessName ?? user?.name ?? "Портал дистрибьютора"}
      accent="bg-brand-900"
    >
      {children}
    </PortalShell>
  );
}

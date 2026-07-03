import { CartProvider } from "@/components/cart-context";
import { ShopShell } from "@/components/shop-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ShopLayout({
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
    <CartProvider>
      <ShopShell businessName={user?.businessName ?? user?.name ?? ""}>
        {children}
      </ShopShell>
    </CartProvider>
  );
}

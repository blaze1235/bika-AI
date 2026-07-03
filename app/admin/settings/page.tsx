import { prisma } from "@/lib/db";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <SettingsClient
      initial={{
        companyName: map.companyName ?? "Bika",
        companyPhone: map.companyPhone ?? "",
        companyAddress: map.companyAddress ?? "",
      }}
    />
  );
}

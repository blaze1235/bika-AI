import { prisma } from "@/lib/db";
import { SettingsClient } from "./settings-client";
import { PALETTE_ACTIVE_KEY, PALETTE_CUSTOM_KEY, parseCustomPalettes } from "@/lib/palette";

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
      activePaletteId={map[PALETTE_ACTIVE_KEY] ?? "forest"}
      customPalettes={parseCustomPalettes(map[PALETTE_CUSTOM_KEY])}
    />
  );
}

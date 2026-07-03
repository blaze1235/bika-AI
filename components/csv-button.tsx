import { Download } from "lucide-react";

/** Simple link-button that downloads the orders CSV export. */
export function CsvButton() {
  return (
    <a
      href="/api/orders/export"
      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50"
    >
      <Download size={16} />
      Экспорт CSV
    </a>
  );
}

import { Badge } from "@/components/ui";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}

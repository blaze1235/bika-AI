"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText } from "@/components/ui";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";
import { ArrowRight, XCircle } from "lucide-react";

/**
 * Status action buttons for an order. Distributors follow the flow
 * (Новый → Подтверждён → Отправлен → Доставлен, отмена до отправки);
 * admin gets the same controls.
 */
export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const next = STATUS_FLOW[status];
  if (next.length === 0) return null;

  async function setStatus(newStatus: OrderStatus) {
    if (newStatus === "CANCELLED" && !confirm("Отменить этот заказ?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {next
          .filter((s) => s !== "CANCELLED")
          .map((s) => (
            <Button key={s} size="sm" disabled={busy} onClick={() => setStatus(s)}>
              <ArrowRight size={15} />
              {STATUS_LABELS[s]}
            </Button>
          ))}
        {next.includes("CANCELLED") && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setStatus("CANCELLED")}
            className="text-red-600"
          >
            <XCircle size={15} />
            Отменить
          </Button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

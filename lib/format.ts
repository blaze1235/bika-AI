import type { OrderStatus, Role, Unit } from "@prisma/client";

/** Format integer UZS: 125000 -> "125 000 сум" */
export function money(value: number): string {
  return `${value.toLocaleString("ru-RU")} сум`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const UNIT_LABELS: Record<Unit, string> = {
  PIECE: "шт",
  KG: "кг",
  LITER: "л",
  BOX: "коробка",
  PACK: "упаковка",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Новый",
  CONFIRMED: "Подтверждён",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

/** Tailwind classes for status badges. */
export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  SHIPPED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELLED: "bg-neutral-100 text-neutral-500 ring-neutral-500/20",
};

/** Allowed next statuses from each state (distributor flow). */
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  DISTRIBUTOR: "Дистрибьютор",
  BUYER: "Покупатель",
};

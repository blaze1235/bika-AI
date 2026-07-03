import type { Unit } from "@prisma/client";

export const UNITS: Unit[] = ["PIECE", "KG", "LITER", "BOX", "PACK"];

type ParsedProduct =
  | { error: string }
  | {
      data: {
        name: string;
        description: string | null;
        price: number;
        unit: Unit;
        stock: number | null;
        imageUrl: string | null;
        categoryId: string | null;
        active: boolean;
      };
    };

/** Validate a product create/edit payload shared by POST and PATCH. */
export function parseProductBody(body: unknown): ParsedProduct {
  const b = body as Record<string, unknown> | null;
  const name = String(b?.name ?? "").trim();
  if (!name) return { error: "Укажите название товара" };

  const price = Number(b?.price);
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) {
    return { error: "Цена должна быть целым положительным числом (в сумах)" };
  }

  const unit = b?.unit as Unit;
  if (!UNITS.includes(unit)) return { error: "Неверная единица измерения" };

  let stock: number | null = null;
  if (b?.stock !== null && b?.stock !== undefined && b?.stock !== "") {
    stock = Number(b.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "Остаток должен быть неотрицательным целым числом" };
    }
  }

  return {
    data: {
      name,
      description: String(b?.description ?? "").trim() || null,
      price,
      unit,
      stock,
      imageUrl: String(b?.imageUrl ?? "").trim() || null,
      categoryId: String(b?.categoryId ?? "") || null,
      active: b?.active === undefined ? true : Boolean(b.active),
    },
  };
}

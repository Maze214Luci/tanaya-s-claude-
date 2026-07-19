import type { IngredientLine, InventoryItem } from "@/lib/types";

export type IngredientStatus = "ok" | "low" | "need";

export interface IngredientCheck {
  name: string;
  quantity: number;
  unit: string;
  status: IngredientStatus;
  available: number;
}

const LOW_STOCK_RATIO = 1.25;

/** Cross-check a scaled ingredient list against current inventory. */
export function crossCheckIngredients(
  ingredients: IngredientLine[],
  inventory: InventoryItem[]
): IngredientCheck[] {
  return ingredients.map((ing) => {
    const match = inventory.find((i) => i.name.toLowerCase() === ing.name.toLowerCase());
    const available = match?.quantity ?? 0;
    let status: IngredientStatus = "need";
    if (available >= ing.quantity * LOW_STOCK_RATIO) status = "ok";
    else if (available >= ing.quantity) status = "low";
    return { name: ing.name, quantity: ing.quantity, unit: ing.unit, status, available };
  });
}

/**
 * Rule (brief #6): deduction happens at meal confirmation, not a separate
 * "cooked" event — this fn is the single place that mutates inventory for a
 * recipe, called by both the "confirm suggestion" and "mark cooked" flows
 * against the exact ingredient list shown to the user.
 */
export function deductInventory(
  inventory: InventoryItem[],
  ingredients: IngredientLine[]
): InventoryItem[] {
  return inventory.map((item) => {
    const used = ingredients.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
    if (!used) return item;
    const quantity = Math.max(0, item.quantity - used.quantity);
    return { ...item, quantity };
  });
}

export function scaleIngredients(
  base: IngredientLine[],
  portionBase: number,
  presentCount: number
): IngredientLine[] {
  const factor = presentCount / Math.max(1, portionBase);
  return base.map((i) => ({ ...i, quantity: Math.round(i.quantity * factor * 100) / 100 }));
}

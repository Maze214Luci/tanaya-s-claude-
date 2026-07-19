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

// Rule (PRD 7.7.46 / #30): every ingredient is scaled independently from
// its own per-serving quantity, never by applying one multiplier to a
// flat "serves N" total — and rounded appropriately for its unit, so a
// count-like ingredient never displays as "2.33 lemons" while a
// weight-based one (233g) isn't crudely rounded away.
const COUNT_UNITS = new Set(["unit", "sprig", "bunch"]);
const COARSE_UNITS = new Set(["kg", "L"]);

function roundForUnit(qty: number, unit: string): number {
  if (COARSE_UNITS.has(unit)) return Math.round(qty * 100) / 100;
  if (COUNT_UNITS.has(unit)) return Math.round(qty * 2) / 2; // nearest half
  return Math.round(qty); // g, ml, tsp, tbsp — nearest whole
}

export function scaleIngredients(
  base: IngredientLine[],
  portionBase: number,
  presentCount: number
): IngredientLine[] {
  const factor = presentCount / Math.max(1, portionBase);
  return base.map((i) => ({ ...i, quantity: roundForUnit(i.quantity * factor, i.unit) }));
}

/** Display-friendly quantity — count-like fractions render as ½/¼/¾. */
export function formatQuantity(qty: number, unit: string): string {
  if (COUNT_UNITS.has(unit) && qty % 1 !== 0) {
    const whole = Math.floor(qty);
    const frac = qty - whole;
    const fracStr = Math.abs(frac - 0.5) < 0.01 ? "½" : Math.abs(frac - 0.25) < 0.01 ? "¼" : Math.abs(frac - 0.75) < 0.01 ? "¾" : frac.toFixed(2).replace(/^0/, "");
    return whole > 0 ? `${whole}${fracStr}` : fracStr;
  }
  return `${qty}`;
}

import type { DishSection, Recipe } from "@/lib/types";

export const DISH_SECTIONS: { key: DishSection; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch_dinner", label: "Lunch & Dinner" },
  { key: "snacks", label: "Snacks" },
];

const BREAKFAST_WORDS = ["poha", "idli", "upma", "paratha", "oats", "dosa", "chilla", "cereal", "bhurji"];
const SNACK_WORDS = ["salad", "wrap", "chaat", "sprouts", "soup"];

/**
 * We don't have a curated, hand-tagged recipe taxonomy — this is a
 * transparent, best-effort heuristic (name keywords, then a quick/light
 * fallback) so the swipe deck's three sections (flowchart 14) are real
 * groupings rather than an arbitrary split of the same pool.
 */
export function sectionForRecipe(recipe: Recipe): DishSection {
  const name = recipe.name.toLowerCase();
  if (BREAKFAST_WORDS.some((w) => name.includes(w))) return "breakfast";
  if (SNACK_WORDS.some((w) => name.includes(w))) return "snacks";
  if (recipe.time_minutes <= 15 && recipe.moods.includes("light")) return "snacks";
  return "lunch_dinner";
}

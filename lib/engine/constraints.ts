import type {
  Allergy,
  Avoidance,
  MoodTag,
  OutputMode,
  Profile,
  Recipe,
} from "@/lib/types";

// Rule (build brief #3): selecting a mood tag disables its opposite rather
// than allowing both and silently returning zero results.
export const MOOD_CONFLICTS: Partial<Record<MoodTag, MoodTag>> = {
  cold: "warm",
  warm: "cold",
};

export interface PersonConstraints {
  profile: Profile;
  allergies: string[]; // hard — never violated
  avoidances: string[]; // soft — can flex, gets logged
}

export interface SuggestionResult {
  recipe: Recipe;
  /** true if this recipe required flexing a soft constraint for someone present */
  deviatesFor: { profileId: string; term: string }[];
}

/**
 * Rule (brief #1): allergies are filtered out before ranking, never
 * relaxed. Avoidances are soft — a recipe that trips one is still
 * eligible, but is flagged so the caller can log a deviation and rank it
 * behind recipes that don't trip anything.
 */
export function filterAndRankRecipes(
  recipes: Recipe[],
  people: PersonConstraints[],
  opts: { veg: boolean; moods: MoodTag[] }
): SuggestionResult[] {
  const candidates = recipes.filter((r) => r.veg === opts.veg);
  const moodFiltered = opts.moods.length
    ? candidates.filter((r) => opts.moods.every((m) => r.moods.includes(m)))
    : candidates;

  const hardSafe = moodFiltered.filter((recipe) => {
    const ingredientNames = recipe.base_ingredients.map((i) => i.name.toLowerCase());
    return !people.some((p) =>
      p.allergies.some((a) => ingredientNames.some((n) => n.includes(a.toLowerCase())))
    );
  });

  const results: SuggestionResult[] = hardSafe.map((recipe) => {
    const ingredientNames = recipe.base_ingredients.map((i) => i.name.toLowerCase());
    const deviatesFor: { profileId: string; term: string }[] = [];
    for (const p of people) {
      for (const term of p.avoidances) {
        if (ingredientNames.some((n) => n.includes(term.toLowerCase()))) {
          deviatesFor.push({ profileId: p.profile.id, term });
        }
      }
    }
    return { recipe, deviatesFor };
  });

  // Recipes with no deviations rank first; stable otherwise.
  return results.sort((a, b) => a.deviatesFor.length - b.deviatesFor.length);
}

export function toPersonConstraints(
  profile: Profile,
  allergies: Allergy[],
  avoidances: Avoidance[]
): PersonConstraints {
  return {
    profile,
    allergies: allergies.filter((a) => a.profile_id === profile.id).map((a) => a.name),
    avoidances: avoidances.filter((a) => a.profile_id === profile.id).map((a) => a.name),
  };
}

/**
 * Rule (brief #4): output mode is computed from how much the present
 * people's constraints actually conflict, not hardcoded to "shared".
 *  - shared: nobody present has an allergy/avoidance the base recipe trips
 *  - base_addon: at most one soft deviation among present people
 *  - split: two or more people have conflicting hard/soft needs that can't
 *    be reconciled by a single dish + add-ons
 */
export function computeOutputMode(
  present: PersonConstraints[],
  chosen: SuggestionResult
): OutputMode {
  const deviatingPeople = new Set(chosen.deviatesFor.map((d) => d.profileId));
  if (deviatingPeople.size === 0) return "shared";
  if (deviatingPeople.size === 1 && present.length > 1) return "base_addon";
  return "split";
}

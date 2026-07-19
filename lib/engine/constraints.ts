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
  /** deliberate "something new" pick outside the household's baseline/likes (PRD 7.3.21) */
  isNewItem: boolean;
}

/**
 * Rule (brief #1): allergies are filtered out before ranking, never
 * relaxed. Avoidances are soft — a recipe that trips one is still
 * eligible, but is flagged so the caller can log a deviation and rank it
 * behind recipes that don't trip anything.
 *
 * `baselineIds`, when non-empty, marks which recipes count as the
 * household's established repertoire (typical-meals entries + previously
 * repeated meals). Everything else is "something new". When empty (a
 * fresh household with no baseline yet), no new/baseline distinction is
 * made — there's nothing established to contrast against.
 */
export function filterAndRankRecipes(
  recipes: Recipe[],
  people: PersonConstraints[],
  opts: { veg: boolean; moods: MoodTag[]; baselineIds?: Set<string> }
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

  const baselineIds = opts.baselineIds ?? new Set<string>();

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
    const isNewItem = baselineIds.size > 0 && !recipe.is_baseline_item && !baselineIds.has(recipe.id);
    return { recipe, deviatesFor, isNewItem };
  });

  // Recipes with no deviations rank first; stable otherwise.
  results.sort((a, b) => a.deviatesFor.length - b.deviatesFor.length);

  return baselineIds.size > 0 ? interleaveVariety(results) : results;
}

/**
 * Interleaves flagged "something new" items into the baseline-ranked list
 * roughly every 4th slot (~1-in-4-5 overall), rather than only ever
 * re-ranking the known baseline.
 */
function interleaveVariety(results: SuggestionResult[]): SuggestionResult[] {
  const baseline = results.filter((r) => !r.isNewItem);
  const novel = results.filter((r) => r.isNewItem);
  if (!novel.length || !baseline.length) return results;

  const out: SuggestionResult[] = [];
  let ni = 0;
  baseline.forEach((r, i) => {
    out.push(r);
    if ((i + 1) % 4 === 0 && ni < novel.length) {
      out.push(novel[ni]);
      ni++;
    }
  });
  while (ni < novel.length) {
    out.push(novel[ni]);
    ni++;
  }
  return out;
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

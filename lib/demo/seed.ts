import type {
  Allergy,
  Avoidance,
  DeviationLogEntry,
  FeedbackEntry,
  Home,
  IngredientLine,
  InventoryItem,
  Invite,
  LikeDislike,
  MealSlot,
  MealSlotPresence,
  Profile,
  Recipe,
  ShoppingListItem,
  TravelDay,
  WeeklyScheduleEntry,
} from "@/lib/types";

export const HOME_ID = "home-1";
export const TANAYA_ID = "profile-tanaya";
export const ANKIT_ID = "profile-ankit";

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function ing(name: string, quantity: number, unit: string): IngredientLine {
  return { name, quantity, unit };
}

export const seedHome: Home = {
  id: HOME_ID,
  name: "Tanaya & Ankit's kitchen",
  timezone: "Asia/Kolkata",
  created_at: new Date().toISOString(),
};

export const seedProfiles: Profile[] = [
  {
    id: TANAYA_ID,
    home_id: HOME_ID,
    role: "admin",
    name: "Tanaya",
    age: 29,
    weight: 62,
    goal: "PCOS management",
    protein_target_g: 70,
    engagement_style: "planner",
    accessibility: { colorblind_safe: false, larger_text: false },
    onboarded: true,
    profile_complete_dismissed: false,
    created_at: new Date().toISOString(),
  },
  {
    id: ANKIT_ID,
    home_id: HOME_ID,
    role: "admin",
    name: "Ankit",
    age: 31,
    weight: 78,
    goal: "Post-workout recovery",
    protein_target_g: 110,
    engagement_style: "quick",
    accessibility: { colorblind_safe: true, larger_text: false },
    onboarded: true,
    profile_complete_dismissed: false,
    created_at: new Date().toISOString(),
  },
];

export const seedAllergies: Allergy[] = [
  { id: "al-1", profile_id: TANAYA_ID, name: "Peanuts" },
];

export const seedAvoidances: Avoidance[] = [
  { id: "av-1", profile_id: TANAYA_ID, name: "Refined sugar" },
  { id: "av-2", profile_id: ANKIT_ID, name: "Mushroom" },
];

export const seedWeeklySchedule: WeeklyScheduleEntry[] = [
  { id: "ws-1", profile_id: TANAYA_ID, day_of_week: 0, type: "veg", nonveg_subtype: null },
  { id: "ws-2", profile_id: TANAYA_ID, day_of_week: 3, type: "veg", nonveg_subtype: null },
  { id: "ws-3", profile_id: TANAYA_ID, day_of_week: 1, type: "fasting", nonveg_subtype: null },
];

export const seedLikesDislikes: LikeDislike[] = [
  { id: "ld-1", profile_id: TANAYA_ID, term: "paneer", sentiment: "like", source: "seed" },
  { id: "ld-2", profile_id: ANKIT_ID, term: "khichdi", sentiment: "dislike", source: "seed" },
];

const rawSeedRecipes: Omit<Recipe, "is_baseline_item">[] = [
  {
    id: "r-poha",
    home_id: HOME_ID,
    name: "Vegetable poha",
    base_ingredients: [ing("Flattened rice", 200, "g"), ing("Onion", 1, "unit"), ing("Peas", 50, "g"), ing("Mustard seeds", 1, "tsp")],
    steps: ["Rinse the poha and let it soften.", "Temper mustard seeds, curry leaves and onion.", "Add peas and turmeric, mix in the poha.", "Finish with lemon and coriander."],
    utensils: ["Kadai", "Strainer"],
    dietary_tags: ["Low-GI", "No peanuts"],
    portion_base: 2,
    is_household_variant: false,
    veg: true,
    moods: ["homely", "light"],
    time_minutes: 20,
  },
  {
    id: "r-paneer-bowl",
    home_id: HOME_ID,
    name: "Grilled paneer bowl",
    base_ingredients: [ing("Paneer", 200, "g"), ing("Bell pepper", 1, "unit"), ing("Lemon", 1, "unit"), ing("Olive oil", 1, "tbsp")],
    steps: ["Cube the paneer and bell pepper into even pieces.", "Toss with olive oil, salt and pepper.", "Grill on a hot pan for 4–5 minutes, turning occasionally.", "Squeeze fresh lemon over the top before serving."],
    utensils: ["Grill pan", "Tongs"],
    dietary_tags: ["Low-GI", "Extra protein"],
    portion_base: 2,
    is_household_variant: false,
    veg: true,
    moods: ["light", "new"],
    time_minutes: 20,
  },
  {
    id: "r-khichdi",
    home_id: HOME_ID,
    name: "Dal khichdi with ghee",
    base_ingredients: [ing("Rice", 150, "g"), ing("Toor dal", 100, "g"), ing("Ghee", 1, "tbsp"), ing("Turmeric", 1, "tsp")],
    steps: ["Pressure-cook rice and dal together with turmeric.", "Temper cumin in ghee and pour over.", "Serve hot with a side of curd."],
    utensils: ["Pressure cooker"],
    dietary_tags: ["Homely", "Fasting-friendly"],
    portion_base: 2,
    is_household_variant: false,
    veg: true,
    moods: ["homely", "warm"],
    time_minutes: 25,
  },
  {
    id: "r-pulao",
    home_id: HOME_ID,
    name: "Vegetable pulao",
    base_ingredients: [ing("Basmati rice", 200, "g"), ing("Mixed vegetables", 150, "g"), ing("Whole spices", 1, "tsp")],
    steps: ["Saute whole spices and vegetables.", "Add soaked rice and water, cook through.", "Rest for 5 minutes before fluffing."],
    utensils: ["Pot with lid"],
    dietary_tags: ["Homely"],
    portion_base: 2,
    is_household_variant: false,
    veg: true,
    moods: ["homely", "warm"],
    time_minutes: 30,
  },
  {
    id: "r-curd-rice",
    home_id: HOME_ID,
    name: "Curd rice with tempering",
    base_ingredients: [ing("Cooked rice", 200, "g"), ing("Curd", 150, "ml"), ing("Mustard seeds", 1, "tsp")],
    steps: ["Mash rice lightly and mix with curd.", "Temper mustard seeds, curry leaves and green chilli.", "Chill briefly before serving."],
    utensils: ["Mixing bowl"],
    dietary_tags: ["Light", "Cooling"],
    portion_base: 2,
    is_household_variant: false,
    veg: true,
    moods: ["homely", "light"],
    time_minutes: 15,
  },
  {
    id: "r-sprouts",
    home_id: HOME_ID,
    name: "Sprouts salad",
    base_ingredients: [ing("Mixed sprouts", 150, "g"), ing("Tomato", 1, "unit"), ing("Lemon", 1, "unit"), ing("Onion", 0.5, "unit")],
    steps: ["Steam sprouts lightly.", "Toss with chopped onion, tomato and lemon juice.", "Season and serve chilled."],
    utensils: ["Steamer"],
    dietary_tags: ["Low-GI", "High protein"],
    portion_base: 2,
    is_household_variant: false,
    veg: true,
    moods: ["light", "cold", "new"],
    time_minutes: 10,
  },
  {
    id: "r-fish-curry",
    home_id: HOME_ID,
    name: "Grilled fish curry",
    base_ingredients: [ing("Fish fillet", 300, "g"), ing("Coconut milk", 150, "ml"), ing("Curry leaves", 1, "sprig")],
    steps: ["Marinate fish in spices for 15 minutes.", "Sear fillets, then simmer in coconut milk curry.", "Finish with curry leaves and a squeeze of lime."],
    utensils: ["Skillet"],
    dietary_tags: ["Extra protein"],
    portion_base: 2,
    is_household_variant: false,
    veg: false,
    moods: ["spicy", "warm"],
    time_minutes: 35,
  },
  {
    id: "r-chicken-soup",
    home_id: HOME_ID,
    name: "Chicken clear soup",
    base_ingredients: [ing("Chicken breast", 200, "g"), ing("Garlic", 3, "unit"), ing("Spring onion", 2, "unit")],
    steps: ["Simmer chicken with garlic and ginger until tender.", "Shred and return to the broth.", "Finish with spring onion and cracked pepper."],
    utensils: ["Soup pot"],
    dietary_tags: ["Extra protein", "Recovery"],
    portion_base: 2,
    is_household_variant: false,
    veg: false,
    moods: ["light", "warm", "homely"],
    time_minutes: 25,
  },
  {
    id: "r-egg-bhurji",
    home_id: HOME_ID,
    name: "Egg bhurji wrap",
    base_ingredients: [ing("Eggs", 4, "unit"), ing("Onion", 1, "unit"), ing("Whole wheat wrap", 2, "unit")],
    steps: ["Scramble eggs with onion, tomato and chilli.", "Warm the wraps.", "Roll the bhurji into the wraps and serve."],
    utensils: ["Skillet"],
    dietary_tags: ["Extra protein"],
    portion_base: 2,
    is_household_variant: false,
    veg: false,
    moods: ["spicy", "new"],
    time_minutes: 15,
  },
];

// The first two count as the household's "typical meals" baseline seeded
// at onboarding; the rest are the shared library, available as "something
// new" suggestions per the baseline-vs-variety engine rule.
const BASELINE_SEED_IDS = new Set(["r-poha", "r-paneer-bowl", "r-khichdi"]);
export const seedRecipes: Recipe[] = rawSeedRecipes.map((r) => ({
  ...r,
  is_baseline_item: BASELINE_SEED_IDS.has(r.id),
}));

export const seedMealSlots: MealSlot[] = [
  { id: "ms-breakfast-0", home_id: HOME_ID, date: todayISO(0), meal_type: "breakfast", status: "finalized", output_mode: "shared", recipe_id: "r-poha", locked: false, is_new_item_suggestion: false, deducted_ingredients: null, cooked_at: null },
  { id: "ms-lunch-0", home_id: HOME_ID, date: todayISO(0), meal_type: "lunch", status: "unplanned", output_mode: null, recipe_id: null, locked: false, is_new_item_suggestion: false, deducted_ingredients: null, cooked_at: null },
  { id: "ms-dinner-0", home_id: HOME_ID, date: todayISO(0), meal_type: "dinner", status: "finalized", output_mode: "shared", recipe_id: "r-paneer-bowl", locked: false, is_new_item_suggestion: false, deducted_ingredients: null, cooked_at: null },
];

export const seedPresence: MealSlotPresence[] = [
  { meal_slot_id: "ms-breakfast-0", profile_id: TANAYA_ID, present: true },
  { meal_slot_id: "ms-breakfast-0", profile_id: ANKIT_ID, present: true },
  { meal_slot_id: "ms-lunch-0", profile_id: TANAYA_ID, present: false },
  { meal_slot_id: "ms-lunch-0", profile_id: ANKIT_ID, present: true },
  { meal_slot_id: "ms-dinner-0", profile_id: TANAYA_ID, present: true },
  { meal_slot_id: "ms-dinner-0", profile_id: ANKIT_ID, present: true },
];

export const seedTravelDays: TravelDay[] = [];

export const seedInventory: InventoryItem[] = [
  { id: "inv-rice", home_id: HOME_ID, name: "Rice", quantity: 2000, unit: "g", zone: "pantry", expiry_estimate: null, freshness_status: "fresh" },
  { id: "inv-toor-dal", home_id: HOME_ID, name: "Toor dal", quantity: 300, unit: "g", zone: "pantry", expiry_estimate: null, freshness_status: "fresh" },
  { id: "inv-milk", home_id: HOME_ID, name: "Milk", quantity: 200, unit: "ml", zone: "fridge", expiry_estimate: todayISO(1), freshness_status: "expiring_soon" },
  { id: "inv-spinach", home_id: HOME_ID, name: "Spinach", quantity: 1, unit: "bunch", zone: "fridge", expiry_estimate: todayISO(2), freshness_status: "expiring_soon" },
  { id: "inv-paneer", home_id: HOME_ID, name: "Paneer", quantity: 200, unit: "g", zone: "fridge", expiry_estimate: todayISO(4), freshness_status: "fresh" },
  { id: "inv-bell-pepper", home_id: HOME_ID, name: "Bell pepper", quantity: 0.5, unit: "unit", zone: "fridge", expiry_estimate: todayISO(3), freshness_status: "fresh" },
  { id: "inv-lemon", home_id: HOME_ID, name: "Lemon", quantity: 0, unit: "unit", zone: "pantry", expiry_estimate: null, freshness_status: "fresh" },
  { id: "inv-flattened-rice", home_id: HOME_ID, name: "Flattened rice", quantity: 400, unit: "g", zone: "pantry", expiry_estimate: null, freshness_status: "fresh" },
  { id: "inv-onion", home_id: HOME_ID, name: "Onion", quantity: 6, unit: "unit", zone: "pantry", expiry_estimate: null, freshness_status: "fresh" },
  { id: "inv-peas", home_id: HOME_ID, name: "Peas", quantity: 100, unit: "g", zone: "freezer", expiry_estimate: null, freshness_status: "fresh" },
  { id: "inv-ghee", home_id: HOME_ID, name: "Ghee", quantity: 400, unit: "g", zone: "pantry", expiry_estimate: null, freshness_status: "fresh" },
];

export const seedShoppingList: ShoppingListItem[] = [
  { id: "sl-1", home_id: HOME_ID, name: "Bell peppers", quantity_needed: "3", source: "low_stock_nudge", status: "pending" },
  { id: "sl-2", home_id: HOME_ID, name: "Lemon", quantity_needed: "2", source: "low_stock_nudge", status: "pending" },
  { id: "sl-3", home_id: HOME_ID, name: "Toor dal", quantity_needed: "1 kg", source: "low_stock_nudge", status: "pending" },
  { id: "sl-4", home_id: HOME_ID, name: "Milk", quantity_needed: "1 L", source: "low_stock_nudge", status: "pending" },
];

export const seedFeedback: FeedbackEntry[] = [];
export const seedDeviations: DeviationLogEntry[] = [];
export const seedInvites: Invite[] = [];

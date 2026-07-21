// Mirrors supabase/schema.sql 1:1 so the demo store and the real Supabase
// queries can share types without translation.

export type Role = "admin" | "member";
export type EngagementStyle = "planner" | "quick";
export type MealType = "breakfast" | "lunch" | "dinner";
export type MealStatus = "unplanned" | "suggested" | "finalized" | "ordered_in";
export type OutputMode = "shared" | "base_addon" | "split";
export type Zone = "pantry" | "fridge" | "freezer";
export type FreshnessStatus = "fresh" | "expiring_soon" | "expired";
export type ShoppingSource = "manual_pick" | "weekly_plan" | "low_stock_nudge";
export type ShoppingStatus = "pending" | "purchased";
export type PortionFeedback = "too_little" | "just_right" | "too_much";
export type ConstraintType = "avoidance" | "schedule";
export type InviteStatus = "pending" | "approved" | "declined";
export type ScheduleDayType = "veg" | "nonveg" | "fasting";
export type MoodTag =
  | "homely"
  | "light"
  | "new"
  | "cold"
  | "warm"
  | "sweet"
  | "spicy";

export interface Home {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Accessibility {
  colorblind_safe: boolean;
  larger_text: boolean;
}

export interface Profile {
  id: string;
  home_id: string | null;
  role: Role;
  name: string;
  age: number | null;
  weight: number | null;
  goal: string | null;
  protein_target_g: number | null;
  engagement_style: EngagementStyle | null;
  accessibility: Accessibility;
  onboarded: boolean;
  profile_complete_dismissed: boolean;
  created_at: string;
}

export interface Allergy {
  id: string;
  profile_id: string;
  name: string;
}

export interface Avoidance {
  id: string;
  profile_id: string;
  name: string;
}

export interface WeeklyScheduleEntry {
  id: string;
  profile_id: string;
  day_of_week: number; // 0=Mon..6=Sun to match the prototype grid
  type: ScheduleDayType;
  nonveg_subtype: string | null;
}

export interface HealthCondition {
  id: string;
  profile_id: string;
  name: string;
  is_private: boolean;
}

export interface VitaminMineralAnomaly {
  id: string;
  profile_id: string;
  nutrient: string;
  status: "deficient" | "elevated";
  is_private: boolean;
}

export interface LikeDislike {
  id: string;
  profile_id: string;
  term: string;
  sentiment: "like" | "dislike";
  source: "seed" | "rating";
}

export type DishRatingValue = "disliked" | "liked" | "loved";
export type DishSection = "breakfast" | "lunch_dinner" | "snacks";

export interface DishRating {
  id: string;
  profile_id: string;
  recipe_id: string;
  rating: DishRatingValue;
  created_at: string;
}

export interface IngredientLine {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  home_id: string | null;
  name: string;
  base_ingredients: IngredientLine[];
  steps: string[];
  utensils: string[];
  dietary_tags: string[];
  portion_base: number;
  is_household_variant: boolean;
  is_baseline_item: boolean;
  veg: boolean;
  moods: MoodTag[];
  time_minutes: number;
}

export interface MealSlot {
  id: string;
  home_id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  status: MealStatus;
  output_mode: OutputMode | null;
  recipe_id: string | null;
  locked: boolean;
  is_new_item_suggestion: boolean;
  deducted_ingredients: IngredientLine[] | null;
  cooked_at: string | null;
}

export interface MealSlotPresence {
  meal_slot_id: string;
  profile_id: string;
  present: boolean;
}

export interface TravelDay {
  id: string;
  profile_id: string;
  date: string;
}

export interface InventoryItem {
  id: string;
  home_id: string;
  name: string;
  quantity: number;
  unit: string;
  zone: Zone;
  expiry_estimate: string | null;
  freshness_status: FreshnessStatus;
}

export interface ShoppingListItem {
  id: string;
  home_id: string;
  name: string;
  quantity_needed: string | null;
  source: ShoppingSource;
  status: ShoppingStatus;
}

export interface FeedbackEntry {
  id: string;
  profile_id: string;
  meal_id: string;
  taste_rating: number | null;
  portion_feedback: PortionFeedback | null;
  repeat_decision: boolean | null;
  created_at: string;
}

export interface DeviationLogEntry {
  id: string;
  profile_id: string;
  meal_id: string | null;
  constraint_type: ConstraintType;
  detail: string;
  created_at: string;
}

export interface Invite {
  id: string;
  home_id: string;
  invitee_contact: string;
  status: InviteStatus;
  proposed_role: Role;
  created_at: string;
}

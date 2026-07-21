"use client";

import { createContext, useContext } from "react";
import type {
  Allergy,
  Avoidance,
  DeviationLogEntry,
  DishRating,
  DishRatingValue,
  FeedbackEntry,
  HealthCondition,
  Home,
  InventoryItem,
  Invite,
  LikeDislike,
  MealSlot,
  MealSlotPresence,
  MoodTag,
  Profile,
  Recipe,
  Role,
  ShoppingListItem,
  TravelDay,
  VitaminMineralAnomaly,
  WeeklyScheduleEntry,
} from "@/lib/types";
import type { SuggestionResult } from "@/lib/engine/constraints";
import type { crossCheckIngredients } from "@/lib/engine/inventory";

export interface State {
  currentProfileId: string | null;
  home: Home | null;
  profiles: Profile[];
  allergies: Allergy[];
  avoidances: Avoidance[];
  weeklySchedule: WeeklyScheduleEntry[];
  healthConditions: HealthCondition[];
  vitaminAnomalies: VitaminMineralAnomaly[];
  likesDislikes: LikeDislike[];
  dishRatings: DishRating[];
  recipes: Recipe[];
  mealSlots: MealSlot[];
  presence: MealSlotPresence[];
  travelDays: TravelDay[];
  inventory: InventoryItem[];
  shoppingList: ShoppingListItem[];
  feedback: FeedbackEntry[];
  deviations: DeviationLogEntry[];
  invites: Invite[];
  onboarded: boolean;
}

export function freshState(): State {
  return {
    currentProfileId: null,
    home: null,
    profiles: [],
    allergies: [],
    avoidances: [],
    weeklySchedule: [],
    healthConditions: [],
    vitaminAnomalies: [],
    likesDislikes: [],
    dishRatings: [],
    recipes: [],
    mealSlots: [],
    presence: [],
    travelDays: [],
    inventory: [],
    shoppingList: [],
    feedback: [],
    deviations: [],
    invites: [],
    onboarded: false,
  };
}

export interface Ctx {
  /** "demo" = localStorage seeded household, no real accounts.
   *  "live" = real Supabase auth + persistence. */
  mode: "demo" | "live";
  state: State;
  currentProfile: Profile | null;
  isAdmin: boolean;
  toasts: string[];
  toast: (msg: string) => void;

  // Auth — implemented by both providers so login/signup screens don't need
  // to branch on mode themselves.
  authSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  authSignUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => void;

  // Demo-only affordances — no-ops under "live".
  resetDemo: () => void;
  signInDemo: () => void;
  switchProfile: (profileId: string) => void;

  createHome: (homeName: string, personName: string) => void;
  savePersonaStep1: (fields: Partial<Profile>) => void;
  saveAllergies: (names: string[]) => void;
  saveAvoidances: (names: string[]) => void;
  saveWeeklySchedule: (entries: Omit<WeeklyScheduleEntry, "id" | "profile_id">[]) => void;
  saveHealthConditions: (entries: { name: string; is_private: boolean }[]) => void;
  saveVitaminAnomalies: (
    entries: { nutrient: string; status: "deficient" | "elevated"; is_private: boolean }[]
  ) => void;
  saveLikesDislikes: (entries: { term: string; sentiment: "like" | "dislike" }[]) => void;
  /** Whole-dish swipe signal (flowchart 14) — upserts one rating per
   * profile per recipe; re-swiping overwrites. */
  rateDish: (recipeId: string, rating: DishRatingValue) => void;
  /** Persists the household's stated typical meals as real baseline recipe
   * stubs (is_baseline_item = true) so the suggestion engine can query them
   * — not just strings on the profile (build-flows prompt, step 8). */
  saveTypicalMeals: (entries: { mealType: MealSlot["meal_type"]; name: string }[]) => void;
  setAccessibility: (fields: Partial<Profile["accessibility"]>) => void;
  dismissProfileNudge: () => void;
  /** Marks persona onboarding done — called once, from the confirm/summary
   * step's final button, independent of which steps were skipped. */
  completeOnboarding: () => void;
  setPresence: (mealSlotId: string, profileId: string, present: boolean) => void;
  setTraveling: (profileId: string, date: string, traveling: boolean) => void;
  isTraveling: (profileId: string, date: string) => boolean;
  getEffectivePresence: (mealSlotId: string) => { profileId: string; present: boolean }[];
  getEffectivePresenceForDate: (date: string) => { profileId: string; present: boolean }[];
  getSuggestions: (mealSlotId: string, opts: { veg: boolean; moods: MoodTag[] }) => SuggestionResult[];
  getSuggestionsForDate: (date: string, opts: { veg: boolean; moods: MoodTag[] }) => SuggestionResult[];
  acceptSuggestion: (mealSlotId: string, recipeId: string) => void;
  markOrderedIn: (mealSlotId: string) => void;
  ensureMealSlot: (date: string, mealType: MealSlot["meal_type"]) => MealSlot;
  markCooked: (mealSlotId: string) => { needsFeedback: boolean };
  submitFeedback: (
    mealSlotId: string,
    fields: { taste_rating: number; portion_feedback: FeedbackEntry["portion_feedback"]; repeat_decision: boolean }
  ) => void;
  hasFeedback: (profileId: string, recipeId: string) => boolean;
  addInventoryItem: (item: Omit<InventoryItem, "id" | "home_id">) => void;
  updateInventoryItem: (id: string, fields: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;
  addShoppingItem: (item: Omit<ShoppingListItem, "id" | "home_id" | "status">) => void;
  togglePurchased: (id: string) => void;
  generateWeek: (weekStartISO: string) => void;
  setSlotRecipe: (mealSlotId: string, recipeId: string) => void;
  regenerateSlot: (mealSlotId: string) => void;
  toggleLockSlot: (mealSlotId: string) => void;
  finalizeWeek: (weekStartISO: string) => void;
  createInvite: (contact: string, role: Role) => void;
  approveInvite: (id: string, role: Role) => void;
  declineInvite: (id: string) => void;
  setMemberRole: (profileId: string, role: Role) => void;
  crossCheck: (recipeId: string, presentCount: number) => ReturnType<typeof crossCheckIngredients>;
}

export const StoreContext = createContext<Ctx | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

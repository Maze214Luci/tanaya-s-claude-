"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DishRatingValue,
  FeedbackEntry,
  InventoryItem,
  MealSlot,
  MoodTag,
  Profile,
  Recipe,
  Role,
  ShoppingListItem,
  WeeklyScheduleEntry,
} from "@/lib/types";
import { StoreContext, freshState, type Ctx, type State } from "@/lib/store/context";
import * as seed from "./seed";
import {
  MOOD_CONFLICTS,
  computeOutputMode,
  filterAndRankRecipes,
  toPersonConstraints,
  type SuggestionResult,
} from "@/lib/engine/constraints";
import { crossCheckIngredients, deductInventory, restoreInventory, scaleIngredients } from "@/lib/engine/inventory";

const STORAGE_KEY = "kitchen-companion-demo-v1";

function seededState(): State {
  return {
    currentProfileId: seed.TANAYA_ID,
    home: seed.seedHome,
    profiles: seed.seedProfiles,
    allergies: seed.seedAllergies,
    avoidances: seed.seedAvoidances,
    weeklySchedule: seed.seedWeeklySchedule,
    healthConditions: [],
    vitaminAnomalies: [],
    likesDislikes: seed.seedLikesDislikes,
    dishRatings: [],
    recipes: seed.seedRecipes,
    mealSlots: seed.seedMealSlots,
    presence: seed.seedPresence,
    travelDays: seed.seedTravelDays,
    inventory: seed.seedInventory,
    shoppingList: seed.seedShoppingList,
    feedback: seed.seedFeedback,
    deviations: seed.seedDeviations,
    invites: seed.seedInvites,
    onboarded: true,
  };
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Baseline = stated typical meals + recipes a profile said they'd repeat.
 * Empty when the household hasn't established one yet (see constraints.ts). */
function computeBaselineIds(s: State): Set<string> {
  const ids = new Set<string>();
  for (const r of s.recipes) if (r.is_baseline_item) ids.add(r.id);
  for (const f of s.feedback) {
    if (!f.repeat_decision) continue;
    const slot = s.mealSlots.find((m) => m.id === f.meal_id);
    if (slot?.recipe_id) ids.add(slot.recipe_id);
  }
  return ids;
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(freshState);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<string[]>([]);

  useEffect(() => {
    // One-time sync from the external localStorage system into React state
    // on mount — there is no pure alternative since localStorage is only
    // reachable client-side.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(raw));
      }
      // No raw state yet: stay unauthenticated (freshState) until the user
      // signs in — signInDemo() is what seeds the demo household.
    } catch {
      // corrupt localStorage — fall back to signed-out state
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const toast = useCallback((msg: string) => {
    setToasts((t) => [...t, msg]);
    setTimeout(() => setToasts((t) => t.slice(1)), 2200);
  }, []);

  const currentProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.currentProfileId) ?? null,
    [state.profiles, state.currentProfileId]
  );
  const isAdmin = currentProfile?.role === "admin";

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(freshState());
  }, []);

  const switchProfile = useCallback((profileId: string) => {
    setState((s) => ({ ...s, currentProfileId: profileId }));
  }, []);

  const signInDemo = useCallback(() => {
    setState((s) => (s.onboarded ? s : seededState()));
  }, []);

  const signOut = useCallback(() => resetDemo(), [resetDemo]);

  const authSignIn = useCallback(async () => {
    signInDemo();
    return { error: null };
  }, [signInDemo]);

  const authSignUp = useCallback(async () => {
    signInDemo();
    return { error: null, needsConfirmation: false };
  }, [signInDemo]);

  const createHome = useCallback((homeName: string, personName: string) => {
    const homeId = uid("home");
    const profileId = uid("profile");
    setState((s) => ({
      ...s,
      home: { id: homeId, name: homeName, timezone: "Asia/Kolkata", created_at: new Date().toISOString() },
      profiles: [
        {
          id: profileId,
          home_id: homeId,
          role: "admin",
          name: personName,
          age: null,
          weight: null,
          goal: null,
          protein_target_g: null,
          engagement_style: null,
          accessibility: { colorblind_safe: false, larger_text: false },
          onboarded: false,
          profile_complete_dismissed: false,
          created_at: new Date().toISOString(),
        },
      ],
      currentProfileId: profileId,
      recipes: seed.seedRecipes.map((r) => ({ ...r, is_baseline_item: false })),
      onboarded: false,
    }));
  }, []);

  const updateCurrentProfile = useCallback((fields: Partial<Profile>) => {
    setState((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.id === s.currentProfileId ? { ...p, ...fields } : p)),
    }));
  }, []);

  const savePersonaStep1 = useCallback(
    (fields: Partial<Profile>) => updateCurrentProfile(fields),
    [updateCurrentProfile]
  );

  const saveAllergies = useCallback((names: string[]) => {
    setState((s) => ({
      ...s,
      allergies: [
        ...s.allergies.filter((a) => a.profile_id !== s.currentProfileId),
        ...names.map((name) => ({ id: uid("al"), profile_id: s.currentProfileId!, name })),
      ],
    }));
  }, []);

  const saveAvoidances = useCallback((names: string[]) => {
    setState((s) => ({
      ...s,
      avoidances: [
        ...s.avoidances.filter((a) => a.profile_id !== s.currentProfileId),
        ...names.map((name) => ({ id: uid("av"), profile_id: s.currentProfileId!, name })),
      ],
    }));
  }, []);

  const saveWeeklySchedule = useCallback((entries: Omit<WeeklyScheduleEntry, "id" | "profile_id">[]) => {
    setState((s) => ({
      ...s,
      weeklySchedule: [
        ...s.weeklySchedule.filter((w) => w.profile_id !== s.currentProfileId),
        ...entries.map((e) => ({ ...e, id: uid("ws"), profile_id: s.currentProfileId! })),
      ],
    }));
  }, []);

  const saveHealthConditions = useCallback((entries: { name: string; is_private: boolean }[]) => {
    setState((s) => ({
      ...s,
      healthConditions: [
        ...s.healthConditions.filter((h) => h.profile_id !== s.currentProfileId),
        ...entries.map((e) => ({ id: uid("hc"), profile_id: s.currentProfileId!, ...e })),
      ],
    }));
  }, []);

  const saveVitaminAnomalies = useCallback(
    (entries: { nutrient: string; status: "deficient" | "elevated"; is_private: boolean }[]) => {
      setState((s) => ({
        ...s,
        vitaminAnomalies: [
          ...s.vitaminAnomalies.filter((v) => v.profile_id !== s.currentProfileId),
          ...entries.map((e) => ({ id: uid("vma"), profile_id: s.currentProfileId!, ...e })),
        ],
      }));
    },
    []
  );

  const saveLikesDislikes = useCallback((entries: { term: string; sentiment: "like" | "dislike" }[]) => {
    setState((s) => ({
      ...s,
      likesDislikes: [
        ...s.likesDislikes.filter((l) => l.profile_id !== s.currentProfileId),
        ...entries.map((e) => ({ id: uid("ld"), profile_id: s.currentProfileId!, ...e, source: "seed" as const })),
      ],
    }));
  }, []);

  const rateDish = useCallback((recipeId: string, rating: DishRatingValue) => {
    setState((s) => {
      const existing = s.dishRatings.find((d) => d.profile_id === s.currentProfileId && d.recipe_id === recipeId);
      if (existing) {
        return { ...s, dishRatings: s.dishRatings.map((d) => (d.id === existing.id ? { ...d, rating } : d)) };
      }
      return {
        ...s,
        dishRatings: [
          ...s.dishRatings,
          { id: uid("dr"), profile_id: s.currentProfileId!, recipe_id: recipeId, rating, created_at: new Date().toISOString() },
        ],
      };
    });
  }, []);

  // build-flows prompt step 8: typical meals become real, queryable
  // recipe rows (not strings on the profile), flagged as the household's
  // baseline repertoire.
  const saveTypicalMeals = useCallback((entries: { mealType: MealSlot["meal_type"]; name: string }[]) => {
    setState((s) => {
      const homeId = s.home?.id ?? seed.HOME_ID;
      const newRecipes: Recipe[] = [];
      for (const entry of entries) {
        const already = s.recipes.some(
          (r) => r.home_id === homeId && r.name.toLowerCase() === entry.name.toLowerCase()
        );
        if (already) continue;
        newRecipes.push({
          id: uid("recipe"),
          home_id: homeId,
          name: entry.name,
          base_ingredients: [],
          steps: [],
          utensils: [],
          dietary_tags: [],
          portion_base: 2,
          is_household_variant: false,
          is_baseline_item: true,
          veg: true,
          moods: [],
          time_minutes: 20,
        });
      }
      return { ...s, recipes: [...s.recipes, ...newRecipes] };
    });
  }, []);

  const setAccessibility = useCallback((fields: Partial<Profile["accessibility"]>) => {
    setState((s) => ({
      ...s,
      profiles: s.profiles.map((p) =>
        p.id === s.currentProfileId ? { ...p, accessibility: { ...p.accessibility, ...fields } } : p
      ),
    }));
  }, []);

  const dismissProfileNudge = useCallback(() => {
    updateCurrentProfile({ profile_complete_dismissed: true });
  }, [updateCurrentProfile]);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({
      ...s,
      onboarded: true,
      profiles: s.profiles.map((p) => (p.id === s.currentProfileId ? { ...p, onboarded: true } : p)),
    }));
  }, []);

  const setPresence = useCallback((mealSlotId: string, profileId: string, present: boolean) => {
    setState((s) => {
      const exists = s.presence.some((p) => p.meal_slot_id === mealSlotId && p.profile_id === profileId);
      return {
        ...s,
        presence: exists
          ? s.presence.map((p) =>
              p.meal_slot_id === mealSlotId && p.profile_id === profileId ? { ...p, present } : p
            )
          : [...s.presence, { meal_slot_id: mealSlotId, profile_id: profileId, present }],
      };
    });
  }, []);

  const isTraveling = useCallback(
    (profileId: string, date: string) => state.travelDays.some((t) => t.profile_id === profileId && t.date === date),
    [state.travelDays]
  );

  const setTraveling = useCallback((profileId: string, date: string, traveling: boolean) => {
    setState((s) => ({
      ...s,
      travelDays: traveling
        ? [...s.travelDays.filter((t) => !(t.profile_id === profileId && t.date === date)), { id: uid("tr"), profile_id: profileId, date }]
        : s.travelDays.filter((t) => !(t.profile_id === profileId && t.date === date)),
    }));
  }, []);

  // Rule (brief #2): travel_days excludes a person from every slot that
  // date, checked before per-slot presence.
  const getEffectivePresence = useCallback(
    (mealSlotId: string) => {
      const slot = state.mealSlots.find((m) => m.id === mealSlotId);
      if (!slot) return [];
      return state.profiles.map((p) => {
        if (isTraveling(p.id, slot.date)) return { profileId: p.id, present: false };
        const row = state.presence.find((pr) => pr.meal_slot_id === mealSlotId && pr.profile_id === p.id);
        return { profileId: p.id, present: row?.present ?? true };
      });
    },
    [state.mealSlots, state.profiles, state.presence, isTraveling]
  );

  const getSuggestions = useCallback(
    (mealSlotId: string, opts: { veg: boolean; moods: MoodTag[] }) => {
      const effective = getEffectivePresence(mealSlotId).filter((p) => p.present);
      const people = effective
        .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
      return filterAndRankRecipes(state.recipes, people, {
        veg: opts.veg,
        moods: opts.moods,
        baselineIds: computeBaselineIds(state),
        dishRatings: state.dishRatings,
      });
    },
    [getEffectivePresence, state]
  );

  // Pure, slot-free variants — used to render "no meal planned yet" screens
  // before a meal_slots row exists, so no store mutation is needed just to
  // look at the page.
  const getEffectivePresenceForDate = useCallback(
    (date: string) => state.profiles.map((p) => ({ profileId: p.id, present: !isTraveling(p.id, date) })),
    [state.profiles, isTraveling]
  );

  const getSuggestionsForDate = useCallback(
    (date: string, opts: { veg: boolean; moods: MoodTag[] }) => {
      const people = getEffectivePresenceForDate(date)
        .filter((p) => p.present)
        .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
      return filterAndRankRecipes(state.recipes, people, {
        veg: opts.veg,
        moods: opts.moods,
        baselineIds: computeBaselineIds(state),
        dishRatings: state.dishRatings,
      });
    },
    [getEffectivePresenceForDate, state]
  );

  const logDeviationsForChoice = useCallback((mealSlotId: string, chosen: SuggestionResult) => {
    if (!chosen.deviatesFor.length) return;
    setState((s) => ({
      ...s,
      deviations: [
        ...s.deviations,
        ...chosen.deviatesFor.map((d) => ({
          id: uid("dev"),
          profile_id: d.profileId,
          meal_id: mealSlotId,
          constraint_type: "avoidance" as const,
          detail: `${chosen.recipe.name} contains "${d.term}"`,
          created_at: new Date().toISOString(),
        })),
      ],
    }));
  }, []);

  // Rule (build brief #6 / flowchart 3 & 18): inventory deducts at
  // confirmation, using the exact scaled ingredient list snapshotted onto
  // the slot so a later swap or cancellation can reverse precisely.
  const acceptSuggestion = useCallback(
    (mealSlotId: string, recipeId: string) => {
      const recipe = state.recipes.find((r) => r.id === recipeId);
      if (!recipe) return;
      const effective = getEffectivePresence(mealSlotId).filter((p) => p.present);
      const people = effective
        .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
      const [ranked] = filterAndRankRecipes([recipe], people, {
        veg: recipe.veg,
        moods: [],
        baselineIds: computeBaselineIds(state),
        dishRatings: state.dishRatings,
      });
      const outputMode = ranked ? computeOutputMode(people, ranked) : "shared";
      if (ranked) logDeviationsForChoice(mealSlotId, ranked);

      const scaled = scaleIngredients(recipe.base_ingredients, recipe.portion_base, effective.length || recipe.portion_base);

      setState((s) => {
        const existing = s.mealSlots.find((m) => m.id === mealSlotId);
        const restored = existing?.deducted_ingredients ? restoreInventory(s.inventory, existing.deducted_ingredients) : s.inventory;
        return {
          ...s,
          inventory: deductInventory(restored, scaled),
          mealSlots: s.mealSlots.map((m) =>
            m.id === mealSlotId
              ? {
                  ...m,
                  recipe_id: recipeId,
                  status: "finalized",
                  output_mode: outputMode,
                  is_new_item_suggestion: ranked?.isNewItem ?? false,
                  deducted_ingredients: scaled,
                }
              : m
          ),
        };
      });
    },
    [state, getEffectivePresence, logDeviationsForChoice]
  );

  // Rule (brief #5 / flowchart 25): ordered-in skips recipe generation
  // entirely and reverses any deduction already made for this slot.
  const markOrderedIn = useCallback((mealSlotId: string) => {
    setState((s) => {
      const existing = s.mealSlots.find((m) => m.id === mealSlotId);
      const restored = existing?.deducted_ingredients ? restoreInventory(s.inventory, existing.deducted_ingredients) : s.inventory;
      return {
        ...s,
        inventory: restored,
        mealSlots: s.mealSlots.map((m) =>
          m.id === mealSlotId ? { ...m, status: "ordered_in", recipe_id: null, output_mode: null, deducted_ingredients: null } : m
        ),
      };
    });
  }, []);

  const ensureMealSlot = useCallback(
    (date: string, mealType: MealSlot["meal_type"]) => {
      const existing = state.mealSlots.find((m) => m.date === date && m.meal_type === mealType);
      if (existing) return existing;
      const created: MealSlot = {
        id: uid("ms"),
        home_id: state.home?.id ?? seed.HOME_ID,
        date,
        meal_type: mealType,
        status: "unplanned",
        output_mode: null,
        recipe_id: null,
        locked: false,
        is_new_item_suggestion: false,
        deducted_ingredients: null,
        cooked_at: null,
      };
      setState((s) => ({ ...s, mealSlots: [...s.mealSlots, created] }));
      return created;
    },
    [state.mealSlots, state.home]
  );

  const crossCheck = useCallback(
    (recipeId: string, presentCount: number) => {
      const recipe = state.recipes.find((r) => r.id === recipeId);
      if (!recipe) return [];
      const scaled = scaleIngredients(recipe.base_ingredients, recipe.portion_base, presentCount || recipe.portion_base);
      return crossCheckIngredients(scaled, state.inventory);
    },
    [state.recipes, state.inventory]
  );

  const hasFeedback = useCallback(
    (profileId: string, recipeId: string) =>
      state.feedback.some((f) => {
        const slot = state.mealSlots.find((m) => m.id === f.meal_id);
        return f.profile_id === profileId && slot?.recipe_id === recipeId;
      }),
    [state.feedback, state.mealSlots]
  );

  // Rule (brief #7): only the FIRST time a recipe appears in a profile's
  // history does feedback get requested; deduction always happens.
  // Flowchart 3 & 11: "mark cooked" is a distinct, later event from
  // confirmation — inventory already moved at confirm time, so this only
  // records a cooked timestamp and checks the first-time feedback gate.
  const markCooked = useCallback(
    (mealSlotId: string) => {
      const slot = state.mealSlots.find((m) => m.id === mealSlotId);
      if (!slot || !slot.recipe_id) return { needsFeedback: false };
      const recipe = state.recipes.find((r) => r.id === slot.recipe_id);
      if (!recipe) return { needsFeedback: false };

      setState((s) => ({
        ...s,
        mealSlots: s.mealSlots.map((m) => (m.id === mealSlotId ? { ...m, cooked_at: new Date().toISOString() } : m)),
      }));

      const alreadySeen = currentProfile ? hasFeedback(currentProfile.id, recipe.id) : true;
      return { needsFeedback: !alreadySeen };
    },
    [state.mealSlots, state.recipes, currentProfile, hasFeedback]
  );

  const submitFeedback = useCallback(
    (
      mealSlotId: string,
      fields: { taste_rating: number; portion_feedback: FeedbackEntry["portion_feedback"]; repeat_decision: boolean }
    ) => {
      if (!currentProfile) return;
      setState((s) => ({
        ...s,
        feedback: [
          ...s.feedback,
          {
            id: uid("fb"),
            profile_id: currentProfile.id,
            meal_id: mealSlotId,
            taste_rating: fields.taste_rating,
            portion_feedback: fields.portion_feedback,
            repeat_decision: fields.repeat_decision,
            created_at: new Date().toISOString(),
          },
        ],
      }));
    },
    [currentProfile]
  );

  const addInventoryItem = useCallback((item: Omit<InventoryItem, "id" | "home_id">) => {
    setState((s) => ({
      ...s,
      inventory: [...s.inventory, { ...item, id: uid("inv"), home_id: s.home?.id ?? seed.HOME_ID }],
    }));
  }, []);

  const updateInventoryItem = useCallback((id: string, fields: Partial<InventoryItem>) => {
    setState((s) => ({
      ...s,
      inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...fields } : i)),
    }));
  }, []);

  const removeInventoryItem = useCallback((id: string) => {
    setState((s) => ({ ...s, inventory: s.inventory.filter((i) => i.id !== id) }));
  }, []);

  const addShoppingItem = useCallback((item: Omit<ShoppingListItem, "id" | "home_id" | "status">) => {
    setState((s) => ({
      ...s,
      shoppingList: [...s.shoppingList, { ...item, id: uid("sl"), home_id: s.home?.id ?? seed.HOME_ID, status: "pending" }],
    }));
  }, []);

  const togglePurchased = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      shoppingList: s.shoppingList.map((i) =>
        i.id === id ? { ...i, status: i.status === "pending" ? "purchased" : "pending" } : i
      ),
    }));
  }, []);

  const generateWeek = useCallback(
    (weekStartISO: string) => {
      setState((s) => {
        const mealTypes: MealSlot["meal_type"][] = ["breakfast", "lunch", "dinner"];
        const slots = [...s.mealSlots];
        const baselineIds = computeBaselineIds(s);
        // Variety logic: track recently-used recipes across the whole week
        // so the same dish doesn't repeat back-to-back within a day or
        // across adjacent days.
        const recentlyUsed: string[] = [];
        let cursor = 0;
        for (let d = 0; d < 7; d++) {
          const date = new Date(weekStartISO);
          date.setDate(date.getDate() + d);
          const iso = date.toISOString().slice(0, 10);
          for (const mealType of mealTypes) {
            const existing = slots.find((m) => m.date === iso && m.meal_type === mealType);
            if (existing && existing.locked) {
              if (existing.recipe_id) recentlyUsed.push(existing.recipe_id);
              continue;
            }
            const veg = d % 3 !== 2;
            const people = s.profiles.map((p) => toPersonConstraints(p, s.allergies, s.avoidances));
            const ranked = filterAndRankRecipes(s.recipes, people, { veg, moods: [], baselineIds, dishRatings: s.dishRatings });
            const fresh = ranked.filter((r) => !recentlyUsed.slice(-3).includes(r.recipe.id));
            const pool = fresh.length ? fresh : ranked;
            const pick = pool[cursor % Math.max(1, pool.length)] ?? ranked[0];
            cursor++;
            if (!pick) continue;
            recentlyUsed.push(pick.recipe.id);
            const outputMode = computeOutputMode(people, pick);
            if (existing) {
              const idx = slots.indexOf(existing);
              slots[idx] = { ...existing, recipe_id: pick.recipe.id, status: "suggested", output_mode: outputMode, is_new_item_suggestion: pick.isNewItem };
            } else {
              slots.push({
                id: uid("ms"),
                home_id: s.home?.id ?? seed.HOME_ID,
                date: iso,
                meal_type: mealType,
                status: "suggested",
                output_mode: outputMode,
                recipe_id: pick.recipe.id,
                locked: false,
                is_new_item_suggestion: pick.isNewItem,
                deducted_ingredients: null,
                cooked_at: null,
              });
            }
          }
        }
        return { ...s, mealSlots: slots };
      });
    },
    []
  );

  const setSlotRecipe = useCallback((mealSlotId: string, recipeId: string) => {
    setState((s) => ({
      ...s,
      mealSlots: s.mealSlots.map((m) => (m.id === mealSlotId ? { ...m, recipe_id: recipeId, status: "suggested" } : m)),
    }));
  }, []);

  const regenerateSlot = useCallback(
    (mealSlotId: string) => {
      const vegRecipes = state.recipes.filter((r) => r.veg);
      const nonVegRecipes = state.recipes.filter((r) => !r.veg);
      const pool = Math.random() > 0.3 ? vegRecipes : nonVegRecipes;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!pick) return;
      setState((s) => ({
        ...s,
        mealSlots: s.mealSlots.map((m) => (m.id === mealSlotId ? { ...m, recipe_id: pick.id, status: "suggested" } : m)),
      }));
    },
    [state.recipes]
  );

  const toggleLockSlot = useCallback((mealSlotId: string) => {
    setState((s) => ({
      ...s,
      mealSlots: s.mealSlots.map((m) => (m.id === mealSlotId ? { ...m, locked: !m.locked } : m)),
    }));
  }, []);

  const finalizeWeek = useCallback((weekStartISO: string) => {
    setState((s) => {
      const weekEnd = new Date(weekStartISO);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const slots = s.mealSlots.map((m) =>
        m.date >= weekStartISO && m.date < weekEnd.toISOString().slice(0, 10) && m.status === "suggested"
          ? { ...m, status: "finalized" as const }
          : m
      );

      const needed = new Map<string, { name: string; qty: number; unit: string }>();
      for (const m of slots) {
        if (m.date < weekStartISO || m.date >= weekEnd.toISOString().slice(0, 10)) continue;
        if (!m.recipe_id) continue;
        const recipe = s.recipes.find((r) => r.id === m.recipe_id);
        if (!recipe) continue;
        for (const ing of recipe.base_ingredients) {
          const inStock = s.inventory.find((i) => i.name.toLowerCase() === ing.name.toLowerCase());
          const shortfall = ing.quantity - (inStock?.quantity ?? 0);
          if (shortfall > 0) {
            const key = ing.name.toLowerCase();
            const prev = needed.get(key);
            needed.set(key, { name: ing.name, qty: (prev?.qty ?? 0) + shortfall, unit: ing.unit });
          }
        }
      }

      const newItems: ShoppingListItem[] = Array.from(needed.values()).map((n) => ({
        id: uid("sl"),
        home_id: s.home?.id ?? seed.HOME_ID,
        name: n.name,
        quantity_needed: `${Math.round(n.qty * 100) / 100} ${n.unit}`,
        source: "weekly_plan",
        status: "pending",
      }));

      return { ...s, mealSlots: slots, shoppingList: [...s.shoppingList, ...newItems] };
    });
  }, []);

  const createInvite = useCallback((contact: string, role: Role) => {
    setState((s) => ({
      ...s,
      invites: [
        ...s.invites,
        { id: uid("inv"), home_id: s.home?.id ?? seed.HOME_ID, invitee_contact: contact, status: "pending", proposed_role: role, created_at: new Date().toISOString() },
      ],
    }));
  }, []);

  const approveInvite = useCallback((id: string, role: Role) => {
    setState((s) => {
      const invite = s.invites.find((i) => i.id === id);
      if (!invite) return s;
      const newProfile: Profile = {
        id: uid("profile"),
        home_id: s.home?.id ?? seed.HOME_ID,
        role,
        name: invite.invitee_contact,
        age: null,
        weight: null,
        goal: null,
        protein_target_g: null,
        engagement_style: null,
        accessibility: { colorblind_safe: false, larger_text: false },
        onboarded: false,
        profile_complete_dismissed: false,
        created_at: new Date().toISOString(),
      };
      return {
        ...s,
        invites: s.invites.map((i) => (i.id === id ? { ...i, status: "approved", proposed_role: role } : i)),
        profiles: [...s.profiles, newProfile],
      };
    });
  }, []);

  const declineInvite = useCallback((id: string) => {
    setState((s) => ({ ...s, invites: s.invites.map((i) => (i.id === id ? { ...i, status: "declined" } : i)) }));
  }, []);

  const setMemberRole = useCallback((profileId: string, role: Role) => {
    setState((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, role } : p)),
    }));
  }, []);

  const value: Ctx = {
    mode: "demo",
    state,
    currentProfile,
    isAdmin,
    toasts,
    toast,
    authSignIn,
    authSignUp,
    signOut,
    resetDemo,
    signInDemo,
    switchProfile,
    createHome,
    savePersonaStep1,
    saveAllergies,
    saveAvoidances,
    saveWeeklySchedule,
    saveHealthConditions,
    saveVitaminAnomalies,
    saveLikesDislikes,
    rateDish,
    saveTypicalMeals,
    setAccessibility,
    dismissProfileNudge,
    completeOnboarding,
    setPresence,
    setTraveling,
    isTraveling,
    getEffectivePresence,
    getEffectivePresenceForDate,
    getSuggestions,
    getSuggestionsForDate,
    acceptSuggestion,
    markOrderedIn,
    ensureMealSlot,
    markCooked,
    submitFeedback,
    hasFeedback,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    addShoppingItem,
    togglePurchased,
    generateWeek,
    setSlotRecipe,
    regenerateSlot,
    toggleLockSlot,
    finalizeWeek,
    createInvite,
    approveInvite,
    declineInvite,
    setMemberRole,
    crossCheck,
  };

  if (!hydrated) return null;

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export { useStore } from "@/lib/store/context";
export const MOOD_CONFLICT_MAP = MOOD_CONFLICTS;

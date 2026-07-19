"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { StoreContext, freshState, type Ctx, type State } from "@/lib/store/context";
import type {
  FeedbackEntry,
  InventoryItem,
  MealSlot,
  Profile,
  Role,
  ShoppingListItem,
  WeeklyScheduleEntry,
} from "@/lib/types";
import { computeOutputMode, filterAndRankRecipes, toPersonConstraints } from "@/lib/engine/constraints";
import { crossCheckIngredients, deductInventory, scaleIngredients } from "@/lib/engine/inventory";

/** Baseline = stated typical meals + recipes a profile said they'd repeat. */
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

const REALTIME_TABLES = [
  "profiles",
  "allergies",
  "avoidances",
  "weekly_schedule",
  "health_conditions",
  "vitamin_mineral_anomalies",
  "likes_dislikes",
  "recipes",
  "meal_slots",
  "meal_slot_presence",
  "travel_days",
  "inventory_items",
  "shopping_list_items",
  "feedback_entries",
  "deviation_log_entries",
  "invites",
] as const;

export function LiveStoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State>(freshState);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<string[]>([]);
  const userIdRef = useRef<string | null>(null);

  const toast = useCallback((msg: string) => {
    setToasts((t) => [...t, msg]);
    setTimeout(() => setToasts((t) => t.slice(1)), 2200);
  }, []);

  const currentProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.currentProfileId) ?? null,
    [state.profiles, state.currentProfileId]
  );
  const isAdmin = currentProfile?.role === "admin";

  // ---- fetch / resync -----------------------------------------------

  const refetchAll = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!profile) {
        setState({ ...freshState(), currentProfileId: userId });
        return;
      }
      if (!profile.home_id) {
        setState({ ...freshState(), currentProfileId: userId, profiles: [profile as Profile] });
        return;
      }

      const [
        homeRes,
        profilesRes,
        allergiesRes,
        avoidancesRes,
        weeklyRes,
        healthRes,
        vmaRes,
        likesRes,
        recipesRes,
        mealSlotsRes,
        presenceRes,
        travelRes,
        inventoryRes,
        shoppingRes,
        feedbackRes,
        deviationsRes,
        invitesRes,
      ] = await Promise.all([
        supabase.from("homes").select("*").eq("id", profile.home_id).maybeSingle(),
        supabase.from("profiles").select("*"),
        supabase.from("allergies").select("*"),
        supabase.from("avoidances").select("*"),
        supabase.from("weekly_schedule").select("*"),
        supabase.from("health_conditions").select("*"),
        supabase.from("vitamin_mineral_anomalies").select("*"),
        supabase.from("likes_dislikes").select("*"),
        supabase.from("recipes").select("*"),
        supabase.from("meal_slots").select("*"),
        supabase.from("meal_slot_presence").select("*"),
        supabase.from("travel_days").select("*"),
        supabase.from("inventory_items").select("*"),
        supabase.from("shopping_list_items").select("*"),
        supabase.from("feedback_entries").select("*"),
        supabase.from("deviation_log_entries").select("*"),
        supabase.from("invites").select("*"),
      ]);

      setState({
        currentProfileId: userId,
        home: homeRes.data ?? null,
        profiles: profilesRes.data ?? [],
        allergies: allergiesRes.data ?? [],
        avoidances: avoidancesRes.data ?? [],
        weeklySchedule: weeklyRes.data ?? [],
        healthConditions: healthRes.data ?? [],
        vitaminAnomalies: vmaRes.data ?? [],
        likesDislikes: likesRes.data ?? [],
        recipes: recipesRes.data ?? [],
        mealSlots: mealSlotsRes.data ?? [],
        presence: presenceRes.data ?? [],
        travelDays: travelRes.data ?? [],
        inventory: inventoryRes.data ?? [],
        shoppingList: shoppingRes.data ?? [],
        feedback: feedbackRes.data ?? [],
        deviations: deviationsRes.data ?? [],
        invites: invitesRes.data ?? [],
        onboarded: profile.onboarded,
      });
    },
    [supabase]
  );

  const handleSession = useCallback(
    async (session: Session | null) => {
      if (!session?.user) {
        userIdRef.current = null;
        setState(freshState());
        return;
      }
      const userId = session.user.id;
      userIdRef.current = userId;

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!profile) {
        // Brand-new user — auto-join if an admin already invited this email.
        const email = session.user.email;
        if (email) {
          const { data: invite } = await supabase
            .from("invites")
            .select("*")
            .eq("invitee_contact", email)
            .eq("status", "pending")
            .maybeSingle();
          if (invite) {
            const meta = session.user.user_metadata as { name?: string } | null;
            const name = meta?.name || email.split("@")[0];
            await supabase.from("profiles").insert({ id: userId, home_id: invite.home_id, role: invite.proposed_role, name });
            await supabase.from("invites").update({ status: "approved" }).eq("id", invite.id);
            toast(`Joined your household — welcome, ${name}!`);
          }
        }
      }
      await refetchAll(userId);
    },
    [supabase, refetchAll, toast]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      await handleSession(session);
      if (active) setHydrated(true);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-device / cross-user live sync (PRD "shared source of truth"):
  // any change to a home-visible table (RLS-filtered) triggers a debounced
  // refetch so everyone's view updates without a manual reload.
  useEffect(() => {
    if (!state.home?.id) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (userIdRef.current) refetchAll(userIdRef.current);
      }, 500);
    };
    const channel = supabase.channel(`home-${state.home.id}`);
    for (const table of REALTIME_TABLES) {
      channel.on("postgres_changes" as never, { event: "*", schema: "public", table }, scheduleRefetch);
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [state.home?.id, supabase, refetchAll]);

  // ---- auth actions ----------------------------------------------------

  const authSignIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const authSignUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return { error: error.message, needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    [supabase]
  );

  const signOut = useCallback(() => {
    supabase.auth.signOut();
  }, [supabase]);

  // Demo-only concepts — no-ops under live accounts.
  const resetDemo = useCallback(() => {}, []);
  const signInDemo = useCallback(() => {}, []);
  const switchProfile = useCallback(() => {}, []);

  // ---- onboarding --------------------------------------------------

  const createHome = useCallback(
    async (homeName: string, personName: string) => {
      const userId = userIdRef.current;
      if (!userId) return;
      const { data: homeRow, error } = await supabase.from("homes").insert({ name: homeName }).select().single();
      if (error || !homeRow) {
        toast(error?.message ?? "Could not create home");
        return;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: userId, home_id: homeRow.id, role: "admin", name: personName });
      if (profileError) {
        toast(profileError.message);
        return;
      }
      await refetchAll(userId);
    },
    [supabase, refetchAll, toast]
  );

  const savePersonaStep1 = useCallback(
    async (fields: Partial<Profile>) => {
      const userId = userIdRef.current;
      if (!userId) return;
      const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
      if (error) toast(error.message);
      await refetchAll(userId);
    },
    [supabase, refetchAll, toast]
  );

  const saveAllergies = useCallback(
    async (names: string[]) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("allergies").delete().eq("profile_id", userId);
      if (names.length) await supabase.from("allergies").insert(names.map((name) => ({ profile_id: userId, name })));
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const saveAvoidances = useCallback(
    async (names: string[]) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("avoidances").delete().eq("profile_id", userId);
      if (names.length) await supabase.from("avoidances").insert(names.map((name) => ({ profile_id: userId, name })));
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const saveWeeklySchedule = useCallback(
    async (entries: Omit<WeeklyScheduleEntry, "id" | "profile_id">[]) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("weekly_schedule").delete().eq("profile_id", userId);
      if (entries.length)
        await supabase.from("weekly_schedule").insert(entries.map((e) => ({ ...e, profile_id: userId })));
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const saveHealthConditions = useCallback(
    async (entries: { name: string; is_private: boolean }[]) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("health_conditions").delete().eq("profile_id", userId);
      if (entries.length)
        await supabase.from("health_conditions").insert(entries.map((e) => ({ ...e, profile_id: userId })));
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const saveVitaminAnomalies = useCallback(
    async (entries: { nutrient: string; status: "deficient" | "elevated"; is_private: boolean }[]) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("vitamin_mineral_anomalies").delete().eq("profile_id", userId);
      if (entries.length)
        await supabase.from("vitamin_mineral_anomalies").insert(entries.map((e) => ({ ...e, profile_id: userId })));
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const saveLikesDislikes = useCallback(
    async (entries: { term: string; sentiment: "like" | "dislike" }[]) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("likes_dislikes").delete().eq("profile_id", userId);
      if (entries.length)
        await supabase
          .from("likes_dislikes")
          .insert(entries.map((e) => ({ ...e, profile_id: userId, source: "seed" })));
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const saveTypicalMeals = useCallback(
    async (entries: { mealType: MealSlot["meal_type"]; name: string }[]) => {
      const userId = userIdRef.current;
      const homeId = state.home?.id;
      if (!userId || !homeId) return;
      const seen = new Set(state.recipes.filter((r) => r.home_id === homeId).map((r) => r.name.toLowerCase()));
      const rows: Record<string, unknown>[] = [];
      for (const entry of entries) {
        const key = entry.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          home_id: homeId,
          name: entry.name,
          base_ingredients: [],
          steps: [],
          utensils: [],
          dietary_tags: [],
          portion_base: 2,
          veg: true,
          moods: [],
          time_minutes: 20,
          is_household_variant: false,
          is_baseline_item: true,
        });
      }
      if (rows.length) await supabase.from("recipes").insert(rows);
      await refetchAll(userId);
    },
    [supabase, refetchAll, state.home, state.recipes]
  );

  const setAccessibility = useCallback(
    async (fields: Partial<Profile["accessibility"]>) => {
      const userId = userIdRef.current;
      if (!userId) return;
      const current = currentProfile?.accessibility ?? { colorblind_safe: false, larger_text: false };
      await supabase.from("profiles").update({ accessibility: { ...current, ...fields } }).eq("id", userId);
      await refetchAll(userId);
    },
    [supabase, refetchAll, currentProfile]
  );

  const dismissProfileNudge = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    await supabase.from("profiles").update({ profile_complete_dismissed: true }).eq("id", userId);
    await refetchAll(userId);
  }, [supabase, refetchAll]);

  const completeOnboarding = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    await supabase.from("profiles").update({ onboarded: true }).eq("id", userId);
    await refetchAll(userId);
  }, [supabase, refetchAll]);

  // ---- presence / travel ------------------------------------------

  const setPresence = useCallback(
    async (mealSlotId: string, profileId: string, present: boolean) => {
      const userId = userIdRef.current;
      await supabase.from("meal_slot_presence").upsert({ meal_slot_id: mealSlotId, profile_id: profileId, present });
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const setTraveling = useCallback(
    async (profileId: string, date: string, traveling: boolean) => {
      const userId = userIdRef.current;
      if (traveling) {
        await supabase.from("travel_days").upsert({ profile_id: profileId, date }, { onConflict: "profile_id,date" });
      } else {
        await supabase.from("travel_days").delete().eq("profile_id", profileId).eq("date", date);
      }
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const isTraveling = useCallback(
    (profileId: string, date: string) => state.travelDays.some((t) => t.profile_id === profileId && t.date === date),
    [state.travelDays]
  );

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

  const getEffectivePresenceForDate = useCallback(
    (date: string) => state.profiles.map((p) => ({ profileId: p.id, present: !isTraveling(p.id, date) })),
    [state.profiles, isTraveling]
  );

  // ---- suggestions ---------------------------------------------------

  const getSuggestions = useCallback(
    (mealSlotId: string, opts: Parameters<Ctx["getSuggestions"]>[1]) => {
      const effective = getEffectivePresence(mealSlotId).filter((p) => p.present);
      const people = effective
        .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
      return filterAndRankRecipes(state.recipes, people, { ...opts, baselineIds: computeBaselineIds(state) });
    },
    [getEffectivePresence, state]
  );

  const getSuggestionsForDate = useCallback(
    (date: string, opts: Parameters<Ctx["getSuggestionsForDate"]>[1]) => {
      const people = getEffectivePresenceForDate(date)
        .filter((p) => p.present)
        .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
      return filterAndRankRecipes(state.recipes, people, { ...opts, baselineIds: computeBaselineIds(state) });
    },
    [getEffectivePresenceForDate, state]
  );

  const acceptSuggestion = useCallback(
    async (mealSlotId: string, recipeId: string) => {
      const userId = userIdRef.current;
      const recipe = state.recipes.find((r) => r.id === recipeId);
      if (!recipe || !userId) return;
      const effective = getEffectivePresence(mealSlotId).filter((p) => p.present);
      const people = effective
        .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
      const [ranked] = filterAndRankRecipes([recipe], people, {
        veg: recipe.veg,
        moods: [],
        baselineIds: computeBaselineIds(state),
      });
      const outputMode = ranked ? computeOutputMode(people, ranked) : "shared";
      await supabase
        .from("meal_slots")
        .update({ recipe_id: recipeId, status: "finalized", output_mode: outputMode, is_new_item_suggestion: ranked?.isNewItem ?? false })
        .eq("id", mealSlotId);
      if (ranked && ranked.deviatesFor.length) {
        await supabase.from("deviation_log_entries").insert(
          ranked.deviatesFor.map((d) => ({
            profile_id: d.profileId,
            meal_id: mealSlotId,
            constraint_type: "avoidance",
            detail: `${ranked.recipe.name} contains "${d.term}"`,
          }))
        );
      }
      await refetchAll(userId);
    },
    [supabase, refetchAll, state, getEffectivePresence]
  );

  const markOrderedIn = useCallback(
    async (mealSlotId: string) => {
      const userId = userIdRef.current;
      await supabase.from("meal_slots").update({ status: "ordered_in", recipe_id: null, output_mode: null }).eq("id", mealSlotId);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const ensureMealSlot = useCallback(
    (date: string, mealType: MealSlot["meal_type"]) => {
      const existing = state.mealSlots.find((m) => m.date === date && m.meal_type === mealType);
      if (existing) return existing;
      const homeId = state.home?.id ?? "";
      const created: MealSlot = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tmp-${Math.random().toString(36).slice(2)}`,
        home_id: homeId,
        date,
        meal_type: mealType,
        status: "unplanned",
        output_mode: null,
        recipe_id: null,
        locked: false,
        is_new_item_suggestion: false,
      };
      setState((s) => ({ ...s, mealSlots: [...s.mealSlots, created] }));
      if (homeId) {
        supabase
          .from("meal_slots")
          .insert(created)
          .then(({ error }) => {
            if (error && userIdRef.current) refetchAll(userIdRef.current);
          });
      }
      return created;
    },
    [state.mealSlots, state.home, supabase, refetchAll]
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

  const markCooked = useCallback(
    (mealSlotId: string) => {
      const slot = state.mealSlots.find((m) => m.id === mealSlotId);
      if (!slot || !slot.recipe_id) return { needsFeedback: false };
      const recipe = state.recipes.find((r) => r.id === slot.recipe_id);
      if (!recipe) return { needsFeedback: false };
      const presentCount = getEffectivePresence(mealSlotId).filter((p) => p.present).length;
      const scaled = scaleIngredients(recipe.base_ingredients, recipe.portion_base, presentCount || recipe.portion_base);
      const previousInventory = state.inventory;
      const newInventory = deductInventory(previousInventory, scaled);
      setState((s) => ({ ...s, inventory: newInventory }));

      (async () => {
        for (const item of newInventory) {
          const before = previousInventory.find((i) => i.id === item.id);
          if (before && before.quantity !== item.quantity) {
            await supabase.from("inventory_items").update({ quantity: item.quantity }).eq("id", item.id);
          }
        }
        if (userIdRef.current) await refetchAll(userIdRef.current);
      })();

      const alreadySeen = currentProfile ? hasFeedback(currentProfile.id, recipe.id) : true;
      return { needsFeedback: !alreadySeen };
    },
    [state, getEffectivePresence, currentProfile, hasFeedback, supabase, refetchAll]
  );

  const submitFeedback = useCallback(
    async (
      mealSlotId: string,
      fields: { taste_rating: number; portion_feedback: FeedbackEntry["portion_feedback"]; repeat_decision: boolean }
    ) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("feedback_entries").insert({
        profile_id: userId,
        meal_id: mealSlotId,
        taste_rating: fields.taste_rating,
        portion_feedback: fields.portion_feedback,
        repeat_decision: fields.repeat_decision,
      });
      await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  // ---- inventory / shopping ------------------------------------------

  const addInventoryItem = useCallback(
    async (item: Omit<InventoryItem, "id" | "home_id">) => {
      const userId = userIdRef.current;
      const homeId = state.home?.id;
      if (!userId || !homeId) return;
      await supabase.from("inventory_items").insert({ ...item, home_id: homeId });
      await refetchAll(userId);
    },
    [supabase, refetchAll, state.home]
  );

  const updateInventoryItem = useCallback(
    async (id: string, fields: Partial<InventoryItem>) => {
      const userId = userIdRef.current;
      await supabase.from("inventory_items").update(fields).eq("id", id);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const removeInventoryItem = useCallback(
    async (id: string) => {
      const userId = userIdRef.current;
      await supabase.from("inventory_items").delete().eq("id", id);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const addShoppingItem = useCallback(
    async (item: Omit<ShoppingListItem, "id" | "home_id" | "status">) => {
      const userId = userIdRef.current;
      const homeId = state.home?.id;
      if (!userId || !homeId) return;
      await supabase.from("shopping_list_items").insert({ ...item, home_id: homeId, status: "pending" });
      await refetchAll(userId);
    },
    [supabase, refetchAll, state.home]
  );

  const togglePurchased = useCallback(
    async (id: string) => {
      const userId = userIdRef.current;
      const item = state.shoppingList.find((i) => i.id === id);
      if (!item) return;
      await supabase.from("shopping_list_items").update({ status: item.status === "pending" ? "purchased" : "pending" }).eq("id", id);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll, state.shoppingList]
  );

  // ---- weekly plan ------------------------------------------------

  const generateWeek = useCallback(
    async (weekStartISO: string) => {
      const userId = userIdRef.current;
      const homeId = state.home?.id;
      if (!userId || !homeId) return;
      const mealTypes: MealSlot["meal_type"][] = ["breakfast", "lunch", "dinner"];
      const baselineIds = computeBaselineIds(state);
      const recentlyUsed: string[] = [];
      let cursor = 0;
      const upserts: Record<string, unknown>[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStartISO);
        date.setDate(date.getDate() + d);
        const iso = date.toISOString().slice(0, 10);
        for (const mealType of mealTypes) {
          const existing = state.mealSlots.find((m) => m.date === iso && m.meal_type === mealType);
          if (existing?.locked) {
            if (existing.recipe_id) recentlyUsed.push(existing.recipe_id);
            continue;
          }
          const veg = d % 3 !== 2;
          const people = state.profiles.map((p) => toPersonConstraints(p, state.allergies, state.avoidances));
          const ranked = filterAndRankRecipes(state.recipes, people, { veg, moods: [], baselineIds });
          const fresh = ranked.filter((r) => !recentlyUsed.slice(-3).includes(r.recipe.id));
          const pool = fresh.length ? fresh : ranked;
          const pick = pool[cursor % Math.max(1, pool.length)] ?? ranked[0];
          cursor++;
          if (!pick) continue;
          recentlyUsed.push(pick.recipe.id);
          const outputMode = computeOutputMode(people, pick);
          upserts.push({
            id: existing?.id,
            home_id: homeId,
            date: iso,
            meal_type: mealType,
            status: "suggested",
            output_mode: outputMode,
            recipe_id: pick.recipe.id,
            locked: false,
            is_new_item_suggestion: pick.isNewItem,
          });
        }
      }
      if (upserts.length) {
        await supabase.from("meal_slots").upsert(upserts, { onConflict: "home_id,date,meal_type" });
      }
      await refetchAll(userId);
    },
    [supabase, refetchAll, state]
  );

  const setSlotRecipe = useCallback(
    async (mealSlotId: string, recipeId: string) => {
      const userId = userIdRef.current;
      await supabase.from("meal_slots").update({ recipe_id: recipeId, status: "suggested" }).eq("id", mealSlotId);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const regenerateSlot = useCallback(
    async (mealSlotId: string) => {
      const userId = userIdRef.current;
      const vegRecipes = state.recipes.filter((r) => r.veg);
      const nonVegRecipes = state.recipes.filter((r) => !r.veg);
      const pool = Math.random() > 0.3 ? vegRecipes : nonVegRecipes;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!pick) return;
      await supabase.from("meal_slots").update({ recipe_id: pick.id, status: "suggested" }).eq("id", mealSlotId);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll, state.recipes]
  );

  const toggleLockSlot = useCallback(
    async (mealSlotId: string) => {
      const userId = userIdRef.current;
      const slot = state.mealSlots.find((m) => m.id === mealSlotId);
      if (!slot) return;
      await supabase.from("meal_slots").update({ locked: !slot.locked }).eq("id", mealSlotId);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll, state.mealSlots]
  );

  const finalizeWeek = useCallback(
    async (weekStartISO: string) => {
      const userId = userIdRef.current;
      const homeId = state.home?.id;
      if (!userId || !homeId) return;
      const weekEnd = new Date(weekStartISO);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndISO = weekEnd.toISOString().slice(0, 10);
      const inWeek = state.mealSlots.filter((m) => m.date >= weekStartISO && m.date < weekEndISO && m.status === "suggested");
      if (inWeek.length) {
        await supabase
          .from("meal_slots")
          .update({ status: "finalized" })
          .in("id", inWeek.map((m) => m.id));
      }

      const needed = new Map<string, { name: string; qty: number; unit: string }>();
      for (const m of inWeek) {
        if (!m.recipe_id) continue;
        const recipe = state.recipes.find((r) => r.id === m.recipe_id);
        if (!recipe) continue;
        for (const ing of recipe.base_ingredients) {
          const inStock = state.inventory.find((i) => i.name.toLowerCase() === ing.name.toLowerCase());
          const shortfall = ing.quantity - (inStock?.quantity ?? 0);
          if (shortfall > 0) {
            const key = ing.name.toLowerCase();
            const prev = needed.get(key);
            needed.set(key, { name: ing.name, qty: (prev?.qty ?? 0) + shortfall, unit: ing.unit });
          }
        }
      }
      const newItems = Array.from(needed.values()).map((n) => ({
        home_id: homeId,
        name: n.name,
        quantity_needed: `${Math.round(n.qty * 100) / 100} ${n.unit}`,
        source: "weekly_plan",
        status: "pending",
      }));
      if (newItems.length) await supabase.from("shopping_list_items").insert(newItems);
      await refetchAll(userId);
    },
    [supabase, refetchAll, state]
  );

  // ---- household -----------------------------------------------------

  const createInvite = useCallback(
    async (contact: string, role: Role) => {
      const userId = userIdRef.current;
      const homeId = state.home?.id;
      if (!userId || !homeId) return;
      await supabase.from("invites").insert({ home_id: homeId, invitee_contact: contact, status: "pending", proposed_role: role });
      await refetchAll(userId);
    },
    [supabase, refetchAll, state.home]
  );

  const approveInvite = useCallback(
    async (id: string, role: Role) => {
      const userId = userIdRef.current;
      await supabase.from("invites").update({ status: "approved", proposed_role: role }).eq("id", id);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const declineInvite = useCallback(
    async (id: string) => {
      const userId = userIdRef.current;
      await supabase.from("invites").update({ status: "declined" }).eq("id", id);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const setMemberRole = useCallback(
    async (profileId: string, role: Role) => {
      const userId = userIdRef.current;
      await supabase.from("profiles").update({ role }).eq("id", profileId);
      if (userId) await refetchAll(userId);
    },
    [supabase, refetchAll]
  );

  const value: Ctx = {
    mode: "live",
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

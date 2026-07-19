"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sun,
  Sunrise,
  MoonStar,
  Flame,
  Sparkles,
  Plane,
} from "lucide-react";
import { useStore, MOOD_CONFLICT_MAP } from "@/lib/store";
import type { MealSlot, MoodTag } from "@/lib/types";

const MOODS: MoodTag[] = ["homely", "light", "new", "cold", "warm", "sweet", "spicy"];
const QUICK_DEFAULT_MOODS: MoodTag[] = ["homely", "light", "new"];

const MEAL_META: Record<MealSlot["meal_type"], { icon: React.ReactNode; label: string }> = {
  breakfast: { icon: <Sunrise size={12} />, label: "breakfast" },
  lunch: { icon: <Sun size={12} />, label: "lunch" },
  dinner: { icon: <MoonStar size={12} />, label: "dinner" },
};

const todayISO = new Date().toISOString().slice(0, 10);

export function MealCard({ mealType }: { mealType: MealSlot["meal_type"] }) {
  const {
    state,
    currentProfile,
    ensureMealSlot,
    getEffectivePresence,
    getEffectivePresenceForDate,
    getSuggestions,
    getSuggestionsForDate,
    setPresence,
    isTraveling,
    setTraveling,
    acceptSuggestion,
    markOrderedIn,
    toast,
  } = useStore();

  const [veg, setVeg] = useState(true);
  const [moods, setMoods] = useState<MoodTag[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(currentProfile?.engagement_style !== "quick");

  const slot = state.mealSlots.find((m) => m.date === todayISO && m.meal_type === mealType);
  const recipe = slot?.recipe_id ? state.recipes.find((r) => r.id === slot.recipe_id) : null;
  const finalized = slot?.status === "finalized" && recipe;
  const orderedIn = slot?.status === "ordered_in";
  const unplanned = !finalized && !orderedIn;

  const presence = slot ? getEffectivePresence(slot.id) : getEffectivePresenceForDate(todayISO);

  const suggestions = unplanned
    ? slot
      ? getSuggestions(slot.id, { veg, moods })
      : getSuggestionsForDate(todayISO, { veg, moods })
    : [];
  const visibleMoods = showMoreFilters ? MOODS : QUICK_DEFAULT_MOODS;

  function togglePresence(profileId: string, next: boolean) {
    const s = ensureMealSlot(todayISO, mealType);
    setPresence(s.id, profileId, next);
  }

  function toggleMood(m: MoodTag) {
    setMoods((cur) => {
      const has = cur.includes(m);
      let next = has ? cur.filter((x) => x !== m) : [...cur, m];
      const conflict = MOOD_CONFLICT_MAP[m];
      if (!has && conflict) next = next.filter((x) => x !== conflict);
      return next;
    });
  }

  function pick(recipeId: string) {
    const s = ensureMealSlot(todayISO, mealType);
    acceptSuggestion(s.id, recipeId);
    toast("Added to today's plan");
  }

  function orderIn() {
    const s = ensureMealSlot(todayISO, mealType);
    markOrderedIn(s.id);
    toast("Logged — inventory untouched");
  }

  return (
    <div
      className={finalized ? "corner-fold" : ""}
      style={{ background: "var(--surf)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: 14, position: "relative", boxShadow: "var(--shadow)" }}
    >
      {finalized && (
        <div className="stamp">
          <Check size={15} />
        </div>
      )}
      <div className="ribbon" style={{ fontSize: 11, color: "var(--sage)", display: "flex", alignItems: "center", gap: 4 }}>
        {MEAL_META[mealType].icon}
        {MEAL_META[mealType].label}
      </div>

      {/* who's home for this slot — always editable, per person per slot */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
        {state.profiles.map((p) => {
          const row = presence.find((pr) => pr.profileId === p.id);
          const traveling = isTraveling(p.id, todayISO);
          const present = row?.present ?? true;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div
                title={traveling ? `${p.name} — traveling` : p.name}
                onClick={() => !traveling && togglePresence(p.id, !present)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: traveling ? "not-allowed" : "pointer",
                  background: traveling ? "var(--bd)" : present ? "var(--sage)" : "transparent",
                  color: traveling ? "var(--ink2)" : present ? "var(--surf)" : "var(--ink2)",
                  border: present || traveling ? "none" : "1px dashed var(--bd)",
                }}
              >
                {p.name[0]}
              </div>
              <Plane
                size={11}
                onClick={() => setTraveling(p.id, todayISO, !traveling)}
                style={{ cursor: "pointer", color: traveling ? "var(--brick)" : "var(--bd)" }}
              />
            </div>
          );
        })}
      </div>

      {finalized && (
        <>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, margin: "2px 0 10px" }}>{recipe!.name}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/recipe/${slot!.id}`} className="btn-link">view recipe →</Link>
            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={orderIn}>
              ate outside / ordered in instead
            </button>
          </div>
        </>
      )}

      {orderedIn && (
        <div className="sub" style={{ margin: "2px 0 0" }}>
          Ordered in <span style={{ fontSize: 10, border: "0.5px solid var(--bd)", padding: "2px 8px", borderRadius: 20, marginLeft: 4 }}>no inventory used</span>
        </div>
      )}

      {unplanned && (
        <>
          <p className="sub" style={{ fontStyle: "italic", margin: "0 0 10px" }}>No meal planned yet — here are some suggestions</p>

          <div style={{ display: "inline-flex", border: "0.5px solid var(--bd)", borderRadius: 20, overflow: "hidden", marginBottom: 10 }}>
            <div className={`chip ${veg ? "sel" : ""}`} style={{ borderRadius: 0 }} onClick={() => setVeg(true)}>Veg</div>
            <div className={`chip ${!veg ? "sel" : ""}`} style={{ borderRadius: 0 }} onClick={() => setVeg(false)}>Non-veg</div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {visibleMoods.map((m) => {
              const disabled = moods.length > 0 && !moods.includes(m) && moods.some((sel) => MOOD_CONFLICT_MAP[sel] === m);
              return (
                <div
                  key={m}
                  className={`chip ${moods.includes(m) ? "sel" : ""} ${disabled ? "off" : ""}`}
                  title={disabled ? `Conflicts with ${moods.find((sel) => MOOD_CONFLICT_MAP[sel] === m)}` : undefined}
                  onClick={() => !disabled && toggleMood(m)}
                  style={{ fontSize: 11, padding: "5px 10px" }}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                </div>
              );
            })}
            {!showMoreFilters && (
              <div className="chip" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setShowMoreFilters(true)}>
                more filters…
              </div>
            )}
          </div>

          <div>
            {suggestions.length === 0 && <p className="sub" style={{ margin: "6px 0" }}>No matches — try fewer filters.</p>}
            {suggestions.slice(0, 5).map((s) => (
              <div
                key={s.recipe.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--bd)" }}
              >
                <div>
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, margin: "0 0 2px", display: "flex", alignItems: "center", gap: 6 }}>
                    {s.recipe.name}
                    {s.isNewItem && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "var(--amber)", fontWeight: 500 }}>
                        <Sparkles size={10} /> something new
                      </span>
                    )}
                  </p>
                  <p className="sub" style={{ margin: 0, fontSize: 11 }}>
                    {s.recipe.moods.join(" · ") || "no mood tags"} · {s.recipe.time_minutes} min
                    {s.deviatesFor.length > 0 && <span style={{ color: "var(--amber)" }}> · flexes an avoidance</span>}
                  </p>
                </div>
                <button className="btn-link" onClick={() => pick(s.recipe.id)}>pick →</button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Link href={`/meals/browse?meal=${mealType}`} className="btn-ghost" style={{ flex: 1, textAlign: "center" }}>
              browse all meals →
            </Link>
            <button className="btn-ghost" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={orderIn}>
              <Flame size={13} /> ordered in
            </button>
          </div>
        </>
      )}
    </div>
  );
}

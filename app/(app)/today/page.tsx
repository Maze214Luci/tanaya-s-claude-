"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sun, ArrowLeft, Flame } from "lucide-react";
import { useStore, MOOD_CONFLICT_MAP } from "@/lib/demo/store";
import type { MealSlot, MoodTag } from "@/lib/types";

const MOODS: MoodTag[] = ["homely", "light", "new", "cold", "warm", "sweet", "spicy"];
const todayISO = new Date().toISOString().slice(0, 10);

export default function TodayPage() {
  return (
    <Suspense fallback={null}>
      <TodayPageInner />
    </Suspense>
  );
}

function TodayPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mealType = (params.get("meal") as MealSlot["meal_type"]) || "lunch";
  const {
    state,
    ensureMealSlot,
    getSuggestions,
    getSuggestionsForDate,
    getEffectivePresence,
    getEffectivePresenceForDate,
    setPresence,
    isTraveling,
    setTraveling,
    acceptSuggestion,
    markOrderedIn,
    toast,
  } = useStore();

  const [veg, setVeg] = useState(true);
  const [moods, setMoods] = useState<MoodTag[]>([]);

  // Read-only until the user takes an action — no meal_slots row is
  // created just by looking at this screen.
  const existingSlot = state.mealSlots.find((m) => m.date === todayISO && m.meal_type === mealType);
  const presence = existingSlot ? getEffectivePresence(existingSlot.id) : getEffectivePresenceForDate(todayISO);
  const results = existingSlot
    ? getSuggestions(existingSlot.id, { veg, moods })
    : getSuggestionsForDate(todayISO, { veg, moods });

  function toggleMood(m: MoodTag) {
    setMoods((cur) => {
      const has = cur.includes(m);
      let next = has ? cur.filter((x) => x !== m) : [...cur, m];
      const conflict = MOOD_CONFLICT_MAP[m];
      if (!has && conflict) next = next.filter((x) => x !== conflict);
      return next;
    });
  }

  function togglePresence(profileId: string, next: boolean) {
    const slot = ensureMealSlot(todayISO, mealType);
    setPresence(slot.id, profileId, next);
  }

  function pick(recipeId: string) {
    const slot = ensureMealSlot(todayISO, mealType);
    acceptSuggestion(slot.id, recipeId);
    router.push(`/recipe/${slot.id}`);
  }

  function orderedIn() {
    const slot = ensureMealSlot(todayISO, mealType);
    markOrderedIn(slot.id);
    toast("Logged — inventory untouched");
    router.push("/");
  }

  return (
    <div>
      <Link href="/" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
        <ArrowLeft size={13} /> back to dashboard
      </Link>
      <p className="ribbon sub" style={{ display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
        <Sun size={12} /> {mealType}
      </p>
      <h1>No meal planned yet. Here are some suggestions</h1>

      <label>Who&apos;s home for {mealType}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {state.profiles.map((p) => {
          const row = presence.find((pr) => pr.profileId === p.id);
          const traveling = isTraveling(p.id, todayISO);
          return (
            <div key={p.id} className="card" style={{ margin: 0, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>{p.name}</span>
              <button
                className={row?.present && !traveling ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 10px", fontSize: 11 }}
                disabled={traveling}
                onClick={() => togglePresence(p.id, !(row?.present ?? true))}
              >
                {traveling ? "traveling" : row?.present ?? true ? "home" : "away"}
              </button>
              <button
                className="btn-ghost"
                style={{ padding: "4px 10px", fontSize: 11 }}
                onClick={() => setTraveling(p.id, todayISO, !traveling)}
              >
                {traveling ? "back today" : "mark traveling"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="toggle-bar" style={{ display: "inline-flex", border: "0.5px solid var(--bd)", borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
        <div className={`chip ${veg ? "sel" : ""}`} style={{ borderRadius: 0 }} onClick={() => setVeg(true)}>Veg</div>
        <div className={`chip ${!veg ? "sel" : ""}`} style={{ borderRadius: 0 }} onClick={() => setVeg(false)}>Non-veg</div>
      </div>

      <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {MOODS.map((m) => {
          const disabled = moods.length && !moods.includes(m) && moods.some((sel) => MOOD_CONFLICT_MAP[sel] === m);
          return (
            <div key={m} className={`chip ${moods.includes(m) ? "sel" : ""} ${disabled ? "off" : ""}`} onClick={() => !disabled && toggleMood(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </div>
          );
        })}
      </div>

      <div>
        {results.length === 0 && <p className="sub">No matches — try fewer filters.</p>}
        {results.map((r) => (
          <div key={r.recipe.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, margin: "0 0 3px" }}>{r.recipe.name}</p>
              <p className="sub" style={{ margin: 0 }}>
                {r.recipe.moods.join(" · ")} · {r.recipe.time_minutes} min
                {r.deviatesFor.length > 0 && <span style={{ color: "var(--amber)" }}> · flexes an avoidance</span>}
              </p>
            </div>
            <button className="btn-link" onClick={() => pick(r.recipe.id)}>pick →</button>
          </div>
        ))}
      </div>

      <div className="divider-trail"><Flame size={13} color="var(--sage)" /></div>
      <button className="btn-ghost" style={{ width: "100%" }} onClick={orderedIn}>
        ate outside / ordered in instead
      </button>
    </div>
  );
}

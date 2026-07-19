"use client";

import { History as HistoryIcon, Star } from "lucide-react";
import { useStore } from "@/lib/store";

export default function HistoryPage() {
  const { state, currentProfile } = useStore();

  const myFeedback = state.feedback
    .filter((f) => f.profile_id === currentProfile?.id)
    .slice()
    .reverse();
  const myDeviations = state.deviations
    .filter((d) => d.profile_id === currentProfile?.id)
    .slice()
    .reverse();

  function recipeNameFor(mealId: string) {
    const slot = state.mealSlots.find((m) => m.id === mealId);
    const recipe = slot?.recipe_id ? state.recipes.find((r) => r.id === slot.recipe_id) : null;
    return recipe?.name ?? "Unknown meal";
  }

  return (
    <div>
      <h1><HistoryIcon size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> History</h1>
      <p className="sub">Meal feedback and soft-constraint deviations, for {currentProfile?.name}</p>

      <h2>Meal feedback</h2>
      <div className="card">
        {myFeedback.length === 0 && <p className="sub" style={{ margin: 0 }}>No feedback logged yet — it&apos;s asked the first time you try a new recipe.</p>}
        {myFeedback.map((f) => (
          <div className="item" key={f.id}>
            <span>{recipeNameFor(f.meal_id)}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink2)" }}>
              <Star size={12} fill="var(--brick)" color="var(--brick)" /> {f.taste_rating}/5 · {f.portion_feedback?.replace("_", " ")} · {f.repeat_decision ? "would repeat" : "won't repeat"}
            </span>
          </div>
        ))}
      </div>

      <h2>Deviation log</h2>
      <p className="sub">Silent by design — soft avoidances/schedule deviations are logged, never blocked.</p>
      <div className="card">
        {myDeviations.length === 0 && <p className="sub" style={{ margin: 0 }}>No deviations logged.</p>}
        {myDeviations.map((d) => (
          <div className="item" key={d.id}>
            <span>{d.detail}</span>
            <span className="tag">{d.constraint_type}</span>
          </div>
        ))}
      </div>

      <h2>Meal history</h2>
      <div className="card">
        {state.mealSlots
          .filter((m) => m.status === "finalized" || m.status === "ordered_in")
          .slice()
          .reverse()
          .slice(0, 20)
          .map((m) => (
            <div className="item" key={m.id}>
              <span>{m.date} · {m.meal_type}</span>
              <span style={{ color: "var(--ink2)", fontSize: 12 }}>
                {m.status === "ordered_in" ? "ordered in" : m.recipe_id ? state.recipes.find((r) => r.id === m.recipe_id)?.name : "—"}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

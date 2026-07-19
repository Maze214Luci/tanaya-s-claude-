"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import { scaleIngredients, crossCheckIngredients } from "@/lib/engine/inventory";

const todayISO = new Date().toISOString().slice(0, 10);

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mealType = (params.get("meal") as "breakfast" | "lunch" | "dinner") || "lunch";
  const { state, ensureMealSlot, acceptSuggestion, getEffectivePresence } = useStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => state.recipes.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [state.recipes, query]
  );

  function pick(recipeId: string) {
    const slot = ensureMealSlot(todayISO, mealType);
    const recipe = state.recipes.find((r) => r.id === recipeId)!;
    const present = getEffectivePresence(slot.id).filter((p) => p.present);

    const violatesAllergy = present.some((p) => {
      const allergies = state.allergies.filter((a) => a.profile_id === p.profileId).map((a) => a.name.toLowerCase());
      return recipe.base_ingredients.some((ing) => allergies.some((a) => ing.name.toLowerCase().includes(a)));
    });
    if (violatesAllergy) {
      alert("This recipe conflicts with a household allergy — pick a different one, or edit the allergy list first.");
      return;
    }

    acceptSuggestion(slot.id, recipeId);
    router.push(`/recipe/${slot.id}`);
  }

  return (
    <div>
      <Link href="/" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
        <ArrowLeft size={13} /> back to dashboard
      </Link>
      <h1>Browse meals for {mealType}</h1>
      <p className="sub">Manual pick — bypasses suggestions, still cross-checked against inventory and hard allergy limits.</p>
      <input placeholder="Search recipes…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {filtered.map((r) => {
        const scaled = scaleIngredients(r.base_ingredients, r.portion_base, r.portion_base);
        const checks = crossCheckIngredients(scaled, state.inventory);
        const shortfall = checks.filter((c) => c.status !== "ok").length;
        return (
          <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, margin: "0 0 3px" }}>{r.name}</p>
              <p className="sub" style={{ margin: 0 }}>
                {r.veg ? "veg" : "non-veg"} · {r.time_minutes} min
                {shortfall > 0 && (
                  <span style={{ color: "var(--amber)", display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6 }}>
                    <AlertTriangle size={11} /> {shortfall} ingredient{shortfall > 1 ? "s" : ""} short
                  </span>
                )}
              </p>
            </div>
            <button className="btn-link" onClick={() => pick(r.id)}>pick →</button>
          </div>
        );
      })}
    </div>
  );
}

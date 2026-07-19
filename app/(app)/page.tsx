"use client";

import Link from "next/link";
import { AlertTriangle, Check, Clock, Sun, Sunrise, MoonStar, Sprout } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import { Avatars } from "@/components/Avatars";
import type { MealSlot } from "@/lib/types";

const todayISO = new Date().toISOString().slice(0, 10);
const MEAL_META: Record<MealSlot["meal_type"], { icon: React.ReactNode; label: string }> = {
  breakfast: { icon: <Sunrise size={12} />, label: "breakfast" },
  lunch: { icon: <Sun size={12} />, label: "lunch" },
  dinner: { icon: <MoonStar size={12} />, label: "dinner" },
};

function MealCard({ mealType }: { mealType: MealSlot["meal_type"] }) {
  const { state, getEffectivePresence } = useStore();
  const slot = state.mealSlots.find((m) => m.date === todayISO && m.meal_type === mealType);
  const recipe = slot?.recipe_id ? state.recipes.find((r) => r.id === slot.recipe_id) : null;
  const present = (slot ? getEffectivePresence(slot.id) : state.profiles.map((p) => ({ profileId: p.id, present: true })))
    .filter((p) => p.present)
    .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const finalized = slot?.status === "finalized" && recipe;
  const orderedIn = slot?.status === "ordered_in";

  return (
    <div className={`mcard ${finalized ? "corner-fold" : ""}`} style={{ background: "var(--surf)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: 12, position: "relative", boxShadow: "var(--shadow)" }}>
      {finalized && (
        <div className="stamp">
          <Check size={15} />
        </div>
      )}
      <div className="ribbon" style={{ fontSize: 11, color: "var(--sage)", display: "flex", alignItems: "center", gap: 4 }}>
        {MEAL_META[mealType].icon}
        {MEAL_META[mealType].label}
      </div>
      {finalized ? (
        <>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, margin: "5px 0 8px" }}>{recipe!.name}</div>
          <Avatars profiles={present} />
          <Link href={`/recipe/${slot.id}`} className="btn-link">view recipe →</Link>
        </>
      ) : orderedIn ? (
        <>
          <div className="sub" style={{ margin: "5px 0 8px" }}>
            Ordered in <span style={{ fontSize: 10, border: "0.5px solid var(--bd)", padding: "2px 8px", borderRadius: 20, marginLeft: 4 }}>no inventory used</span>
          </div>
          <Avatars profiles={present} />
        </>
      ) : (
        <>
          <div className="sub" style={{ fontStyle: "italic", margin: "5px 0 8px" }}>No meal planned yet</div>
          <Avatars profiles={present} />
          <Link href={`/today?meal=${mealType}`} className="btn-link">see suggestions →</Link>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { state, currentProfile, dismissProfileNudge } = useStore();
  const lowStock = state.inventory.filter((i) => i.quantity <= 0 || i.freshness_status === "expired");
  const expiring = state.inventory.filter((i) => i.freshness_status === "expiring_soon");
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  const incomplete = currentProfile && !currentProfile.age && !currentProfile.profile_complete_dismissed;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sprout size={26} color="var(--sage)" />
        <h1 style={{ margin: 0 }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {state.profiles.map((p) => p.name).join(" & ")}
        </h1>
      </div>
      <p className="sub" style={{ marginLeft: 34 }}>{dateLabel}</p>

      {incomplete && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="sub" style={{ margin: 0 }}>Complete your profile for better suggestions.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/onboarding/persona" className="btn-link">complete</Link>
            <button className="btn-ghost" onClick={dismissProfileNudge}>dismiss</button>
          </div>
        </div>
      )}

      <div className="meals" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <MealCard mealType="breakfast" />
        <MealCard mealType="lunch" />
        <MealCard mealType="dinner" />
      </div>

      <div className="divider-trail"><Sprout size={13} color="var(--sage)" /></div>
      <h2><Sprout size={15} color="var(--sage)" />Pantry notes</h2>
      <div className="card">
        {lowStock.length === 0 && expiring.length === 0 && (
          <div className="item"><span className="sub" style={{ margin: 0 }}>Pantry looks healthy — nothing urgent.</span></div>
        )}
        {lowStock.length > 0 && (
          <div className="item">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} color="var(--brick)" /> Low on {lowStock.map((i) => i.name).join(", ")}
            </span>
          </div>
        )}
        {expiring.map((i) => (
          <div className="item" key={i.id}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} color="var(--brick)" /> Use {i.name} soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

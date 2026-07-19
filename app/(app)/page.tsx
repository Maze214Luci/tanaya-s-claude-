"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Sprout } from "lucide-react";
import { useStore } from "@/lib/store";
import { MealCard } from "@/components/MealCard";

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
          {state.profiles.map((p) => p.name).join(" & ") || "there"}
        </h1>
      </div>
      <p className="sub" style={{ marginLeft: 34 }}>{dateLabel}</p>

      {incomplete && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="sub" style={{ margin: 0 }}>Complete your profile for better suggestions.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/profile" className="btn-link">complete</Link>
            <button className="btn-ghost" onClick={dismissProfileNudge}>dismiss</button>
          </div>
        </div>
      )}

      {/* Dashboard is the single home for meal status — all three slots
          always visible, unplanned ones carry their suggestions inline. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
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

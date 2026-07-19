"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Lock, LockOpen, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import type { MealSlot } from "@/lib/types";

const MEAL_TYPES: MealSlot["meal_type"][] = ["breakfast", "lunch", "dinner"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyPlanPage() {
  const router = useRouter();
  const { state, generateWeek, regenerateSlot, toggleLockSlot, finalizeWeek, toast } = useStore();
  const [weekStart] = useState(() => mondayOf(new Date()));

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekStart]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Map<string, MealSlot>>();
    for (const date of weekDates) map.set(date, new Map());
    for (const slot of state.mealSlots) {
      if (map.has(slot.date)) map.get(slot.date)!.set(slot.meal_type, slot);
    }
    return map;
  }, [state.mealSlots, weekDates]);

  const anyPlanned = weekDates.some((d) => (slotsByDate.get(d)?.size ?? 0) > 0);

  return (
    <div>
      <h1><CalendarDays size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> This week</h1>
      <p className="sub">
        {new Date(weekDates[0]).toLocaleDateString("en-US", { day: "numeric", month: "short" })} –{" "}
        {new Date(weekDates[6]).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button className="btn-primary" onClick={() => generateWeek(weekStart)}>
          {anyPlanned ? "regenerate draft (keeps locked slots)" : "generate draft week"}
        </button>
        {anyPlanned && (
          <button
            className="btn-ghost"
            onClick={() => {
              finalizeWeek(weekStart);
              toast("Week finalized — cook instructions & grocery list ready");
              router.push("/shopping-list");
            }}
          >
            finalize week →
          </button>
        )}
      </div>

      {weekDates.map((date, i) => {
        const dayMeals = slotsByDate.get(date);
        return (
          <div key={date} className="card corner-fold">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <b style={{ fontSize: 13 }}>{DAY_LABELS[i]}</b>
              <span className="sub" style={{ margin: 0 }}>{new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
            </div>
            {MEAL_TYPES.map((mt) => {
              const slot = dayMeals?.get(mt);
              const recipe = slot?.recipe_id ? state.recipes.find((r) => r.id === slot.recipe_id) : null;
              return (
                <div className="item" key={mt}>
                  <span style={{ textTransform: "capitalize", color: "var(--ink2)", fontSize: 12, width: 70 }}>{mt}</span>
                  <span style={{ flex: 1, fontStyle: recipe ? "normal" : "italic", color: recipe ? "var(--ink)" : "var(--ink2)" }}>
                    {recipe ? recipe.name : "not planned"}
                  </span>
                  {slot && (
                    <span style={{ display: "flex", gap: 8 }}>
                      <RefreshCw
                        size={13}
                        style={{ cursor: slot.locked ? "not-allowed" : "pointer", opacity: slot.locked ? 0.3 : 1 }}
                        onClick={() => !slot.locked && regenerateSlot(slot.id)}
                      />
                      {slot.locked ? (
                        <Lock size={13} style={{ cursor: "pointer", color: "var(--sage)" }} onClick={() => toggleLockSlot(slot.id)} />
                      ) : (
                        <LockOpen size={13} style={{ cursor: "pointer", color: "var(--ink2)" }} onClick={() => toggleLockSlot(slot.id)} />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

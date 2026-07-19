"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import type { FeedbackEntry } from "@/lib/types";

export function FeedbackModal({
  mealSlotId,
  recipeName,
  onDone,
}: {
  mealSlotId: string;
  recipeName: string;
  onDone: () => void;
}) {
  const { submitFeedback, toast } = useStore();
  const [stars, setStars] = useState(4);
  const [portion, setPortion] = useState<FeedbackEntry["portion_feedback"]>("just_right");
  const [repeat, setRepeat] = useState(true);

  function save() {
    submitFeedback(mealSlotId, { taste_rating: stars, portion_feedback: portion, repeat_decision: repeat });
    toast("✦ Feedback saved — inventory updated");
    onDone();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "var(--bg)", borderRadius: 18, padding: "1.5rem", maxWidth: 400, width: "90%", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <p style={{ fontSize: 11, color: "var(--ink2)", margin: "0 0 4px" }}>first time trying this</p>
        <h1 style={{ fontSize: 19 }}>How was the {recipeName}?</h1>
        <label>Taste</label>
        <div style={{ display: "flex", gap: 6, margin: "6px 0 16px", fontSize: 24 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={22}
              fill={n <= stars ? "var(--brick)" : "none"}
              color={n <= stars ? "var(--brick)" : "var(--bd)"}
              style={{ cursor: "pointer" }}
              onClick={() => setStars(n)}
            />
          ))}
        </div>
        <label>Portion size</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["too_little", "just_right", "too_much"] as const).map((p) => (
            <div
              key={p}
              className={`chip ${portion === p ? "sel" : ""}`}
              style={{ flex: 1, justifyContent: "center", textAlign: "center" }}
              onClick={() => setPortion(p)}
            >
              {p === "too_little" ? "Too little" : p === "just_right" ? "Just right" : "Too much"}
            </div>
          ))}
        </div>
        <label>Make this again?</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div className={`chip ${repeat ? "sel" : ""}`} style={{ flex: 1, justifyContent: "center", textAlign: "center" }} onClick={() => setRepeat(true)}>
            Yes, repeat it
          </div>
          <div className={`chip ${!repeat ? "sel" : ""}`} style={{ flex: 1, justifyContent: "center", textAlign: "center" }} onClick={() => setRepeat(false)}>
            No, skip next time
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={save}>
          save feedback
        </button>
      </div>
    </div>
  );
}

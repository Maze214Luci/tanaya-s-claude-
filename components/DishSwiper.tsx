"use client";

import { useMemo, useState } from "react";
import { Heart, ThumbsDown, ThumbsUp, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { DISH_SECTIONS, sectionForRecipe } from "@/lib/engine/dishSections";
import type { DishSection } from "@/lib/types";

const TARGET_PER_SECTION = 15;
const DRAG_THRESHOLD = 90;

export function DishSwiper({ onDone }: { onDone?: () => void }) {
  const { state, currentProfile, rateDish } = useStore();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [skipNudge, setSkipNudge] = useState(false);
  const [confirmedSkip, setConfirmedSkip] = useState<Set<DishSection>>(new Set());

  const section = DISH_SECTIONS[sectionIdx].key;

  const myRatings = useMemo(
    () => new Set(state.dishRatings.filter((d) => d.profile_id === currentProfile?.id).map((d) => d.recipe_id)),
    [state.dishRatings, currentProfile?.id]
  );

  const sectionRecipes = useMemo(() => state.recipes.filter((r) => sectionForRecipe(r) === section), [state.recipes, section]);
  const ratedInSection = sectionRecipes.filter((r) => myRatings.has(r.id)).length;
  const target = Math.min(TARGET_PER_SECTION, sectionRecipes.length);
  const deck = sectionRecipes.filter((r) => !myRatings.has(r.id));
  const card = deck[0];

  const sectionDone = target === 0 || ratedInSection >= target;
  const canSkip = confirmedSkip.has(section);

  function rate(rating: "disliked" | "liked" | "loved") {
    if (!card) return;
    rateDish(card.id, rating);
    setDragX(0);
  }

  function goNextSection() {
    setSkipNudge(false);
    if (sectionIdx < DISH_SECTIONS.length - 1) {
      setSectionIdx((i) => i + 1);
    } else {
      onDone?.();
    }
  }

  function attemptAdvance() {
    if (sectionDone || canSkip) {
      goNextSection();
    } else {
      setSkipNudge(true);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!card) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX((x) => x + e.movementX);
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > DRAG_THRESHOLD) rate("liked");
    else if (dragX < -DRAG_THRESHOLD) rate("disliked");
    else setDragX(0);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {DISH_SECTIONS.map((s, i) => {
          const recipesHere = state.recipes.filter((r) => sectionForRecipe(r) === s.key);
          const ratedHere = recipesHere.filter((r) => myRatings.has(r.id)).length;
          const done = ratedHere >= Math.min(TARGET_PER_SECTION, recipesHere.length);
          return (
            <div
              key={s.key}
              onClick={() => setSectionIdx(i)}
              className="chip"
              style={{
                flex: 1,
                justifyContent: "center",
                textAlign: "center",
                background: i === sectionIdx ? "var(--sage-deep)" : done ? "var(--buttermilk)" : "var(--surf)",
                color: i === sectionIdx ? "var(--surf)" : "var(--ink2)",
                borderColor: i === sectionIdx ? "var(--sage-deep)" : "var(--bd)",
              }}
            >
              {s.label} {done && "✓"}
            </div>
          );
        })}
      </div>

      <p className="sub" style={{ textAlign: "center" }}>
        {ratedInSection} of {target || 0} rated in {DISH_SECTIONS[sectionIdx].label.toLowerCase()}
      </p>

      {card ? (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            touchAction: "none",
            cursor: "grab",
            background: "var(--surf)",
            border: "1px solid var(--bd)",
            borderRadius: 8,
            padding: "32px 22px",
            minHeight: 220,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
            transition: dragging ? "none" : "transform 0.2s ease",
            boxShadow: "var(--shadow)",
            position: "relative",
          }}
        >
          {dragX > 30 && <span style={{ position: "absolute", top: 16, right: 20, color: "var(--sage-deep)", fontWeight: 700, fontSize: 13 }}>LIKE</span>}
          {dragX < -30 && <span style={{ position: "absolute", top: 16, left: 20, color: "var(--brick)", fontWeight: 700, fontSize: 13 }}>PASS</span>}
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 24, margin: "0 0 8px" }}>{card.name}</p>
          <p className="sub" style={{ margin: 0 }}>
            {card.veg ? "veg" : "non-veg"} · {card.moods.join(", ") || "no tags"} · {card.time_minutes} min
          </p>
        </div>
      ) : (
        <div className="card card-highlight" style={{ textAlign: "center", padding: "32px 22px" }}>
          <Sparkles size={22} color="var(--sage-deep)" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0 }}>Nothing left to rate here — nice work.</p>
        </div>
      )}

      {card && (
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 18 }}>
          <button
            className="btn-ghost"
            style={{ width: 52, height: 52, borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--brick)", color: "var(--brick)" }}
            onClick={() => rate("disliked")}
            aria-label="Dislike"
          >
            <ThumbsDown size={20} />
          </button>
          <button
            className="btn-ghost"
            style={{ width: 52, height: 52, borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--amber)", color: "var(--amber)" }}
            onClick={() => rate("loved")}
            aria-label="Love"
          >
            <Heart size={20} />
          </button>
          <button
            className="btn-ghost"
            style={{ width: 52, height: 52, borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--sage-deep)", color: "var(--sage-deep)" }}
            onClick={() => rate("liked")}
            aria-label="Like"
          >
            <ThumbsUp size={20} />
          </button>
        </div>
      )}

      {skipNudge && (
        <div className="card card-highlight" style={{ marginTop: 18 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13 }}>You&apos;ll get better suggestions if you finish rating this section.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setSkipNudge(false)}>keep swiping</button>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                setConfirmedSkip((s) => new Set(s).add(section));
                setSkipNudge(false);
                goNextSection();
              }}
            >
              skip anyway
            </button>
          </div>
        </div>
      )}

      {!skipNudge && (
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <button className="btn-primary" onClick={attemptAdvance}>
            {sectionIdx < DISH_SECTIONS.length - 1 ? "next section →" : "finish"}
          </button>
        </div>
      )}
    </div>
  );
}

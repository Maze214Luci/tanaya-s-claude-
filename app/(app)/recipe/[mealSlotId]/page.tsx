"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ListChecks, Apple, Minus, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatars } from "@/components/Avatars";
import { IngredientBadge } from "@/components/StatusIcon";
import { FeedbackModal } from "@/components/FeedbackModal";
import { scaleIngredients, crossCheckIngredients, formatQuantity } from "@/lib/engine/inventory";

export default function RecipePage({ params }: { params: Promise<{ mealSlotId: string }> }) {
  const { mealSlotId } = use(params);
  const router = useRouter();
  const { state, getEffectivePresence, markCooked, toast } = useStore();
  const [showFeedback, setShowFeedback] = useState(false);
  const [portionOverride, setPortionOverride] = useState<number | null>(null);

  const slot = state.mealSlots.find((m) => m.id === mealSlotId);
  const recipe = slot?.recipe_id ? state.recipes.find((r) => r.id === slot.recipe_id) : null;

  if (!slot || !recipe) {
    return (
      <div>
        <Link href="/" className="sub">← back to dashboard</Link>
        <p className="sub" style={{ marginTop: 12 }}>No recipe here yet.</p>
      </div>
    );
  }

  const present = getEffectivePresence(slot.id)
    .filter((p) => p.present)
    .map((p) => state.profiles.find((pr) => pr.id === p.profileId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Headcount from actual presence for this slot — a manual override here
  // is a one-time adjustment (e.g. a guest), never written back to the
  // recipe's stored portion_base.
  const headcount = portionOverride ?? present.length ?? recipe.portion_base;
  const scaled = scaleIngredients(recipe.base_ingredients, recipe.portion_base, headcount || recipe.portion_base);
  const checks = crossCheckIngredients(scaled, state.inventory);

  const allergyTags = present.flatMap((p) => state.allergies.filter((a) => a.profile_id === p.id).map((a) => `No ${a.name.toLowerCase()}`));

  function handleMarkCooked() {
    const { needsFeedback } = markCooked(mealSlotId);
    if (needsFeedback) {
      setShowFeedback(true);
    } else {
      toast("Marked cooked — inventory updated");
      router.push("/");
    }
  }

  return (
    <div>
      <Link href="/" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
        <ArrowLeft size={13} /> back to dashboard
      </Link>
      <p className="ribbon sub" style={{ margin: 0 }}>{slot.meal_type} · {slot.date === new Date().toISOString().slice(0, 10) ? "today" : slot.date}</p>
      <h1 style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {recipe.name}
        {slot.is_new_item_suggestion && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--amber)", fontWeight: 500 }}>
            <Sparkles size={12} /> something new
          </span>
        )}
      </h1>
      <Avatars profiles={present} />
      <div style={{ margin: "8px 0" }}>
        {slot.output_mode && (
          <span className="tag"><b>{slot.output_mode.replace("_", " + ")}</b> · output mode</span>
        )}
        {recipe.dietary_tags.map((t) => (
          <span className="tag" key={t}><b>{t}</b></span>
        ))}
        {allergyTags.map((t) => (
          <span className="tag" key={t}><b>{t}</b> · allergy</span>
        ))}
      </div>

      <h2><Apple size={15} color="var(--sage)" />Ingredients</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span className="sub" style={{ margin: 0 }}>Portions</span>
        <button
          className="btn-ghost"
          style={{ padding: "3px 8px" }}
          onClick={() => setPortionOverride(Math.max(1, headcount - 1))}
        >
          <Minus size={12} />
        </button>
        <span style={{ fontSize: 13, minWidth: 14, textAlign: "center" }}>{headcount}</span>
        <button
          className="btn-ghost"
          style={{ padding: "3px 8px" }}
          onClick={() => setPortionOverride(headcount + 1)}
        >
          <Plus size={12} />
        </button>
        {portionOverride !== null && (
          <button className="btn-link" onClick={() => setPortionOverride(null)}>reset to presence ({present.length})</button>
        )}
      </div>
      <div className="card stitch">
        {recipe.base_ingredients.length === 0 && (
          <p className="sub" style={{ margin: 0 }}>No ingredients listed yet — this looks like a quick baseline stub. Edit it to add a full ingredient list.</p>
        )}
        {scaled.map((ing, i) => (
          <div className="item" key={ing.name}>
            <span>{formatQuantity(ing.quantity, ing.unit)}{ing.unit} {ing.name}</span>
            <IngredientBadge status={checks[i]?.status ?? "need"} />
          </div>
        ))}
      </div>

      <h2><ListChecks size={15} color="var(--sage)" />Steps</h2>
      {recipe.steps.length === 0 ? (
        <p className="sub">No steps added yet.</p>
      ) : (
        <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 18, listStyleType: "decimal" }}>
          {recipe.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      {recipe.utensils.length > 0 && (
        <>
          <h2>Utensils</h2>
          <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recipe.utensils.map((u) => (
              <span className="chip" key={u}>{u}</span>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={() => toast("Recipe link copied for the cook — no login required")}>
          <ExternalLink size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} /> share with cook
        </button>
        <button className="btn-primary" style={{ flex: 1 }} onClick={handleMarkCooked}>
          mark cooked
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          mealSlotId={mealSlotId}
          recipeName={recipe.name}
          onDone={() => {
            setShowFeedback(false);
            router.push("/");
          }}
        />
      )}
    </div>
  );
}

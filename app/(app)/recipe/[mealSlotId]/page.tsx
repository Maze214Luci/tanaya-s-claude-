"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ListChecks, Apple } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import { Avatars } from "@/components/Avatars";
import { IngredientBadge } from "@/components/StatusIcon";
import { FeedbackModal } from "@/components/FeedbackModal";
import { scaleIngredients } from "@/lib/engine/inventory";

export default function RecipePage({ params }: { params: Promise<{ mealSlotId: string }> }) {
  const { mealSlotId } = use(params);
  const router = useRouter();
  const { state, getEffectivePresence, markCooked, crossCheck, toast } = useStore();
  const [showFeedback, setShowFeedback] = useState(false);

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

  const scaled = scaleIngredients(recipe.base_ingredients, recipe.portion_base, present.length || recipe.portion_base);
  const checks = crossCheck(recipe.id, present.length);

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
      <h1>{recipe.name}</h1>
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
      <div className="card stitch">
        {scaled.map((ing, i) => (
          <div className="item" key={ing.name}>
            <span>{ing.quantity}{ing.unit} {ing.name}</span>
            <IngredientBadge status={checks[i]?.status ?? "need"} />
          </div>
        ))}
      </div>

      <h2><ListChecks size={15} color="var(--sage)" />Steps</h2>
      <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 18, listStyleType: "decimal" }}>
        {recipe.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

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

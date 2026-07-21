"use client";

import { useState } from "react";
import { UserRound, X, Leaf, Drumstick, Moon, Pencil, Heart, ThumbsUp, ThumbsDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { DishSwiper } from "@/components/DishSwiper";
import { DISH_SECTIONS, sectionForRecipe } from "@/lib/engine/dishSections";
import type { DishSection, ScheduleDayType } from "@/lib/types";

const GOALS = ["PCOS management", "Weight loss", "Muscle gain", "Maintenance", "Post-workout recovery", "General wellness"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NONVEG_SUBTYPES = ["chicken", "fish", "mutton", "egg", "other"];
const MEAL_TYPES: { key: "breakfast" | "lunch" | "dinner"; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

function Section({
  title,
  icon,
  editing,
  onEdit,
  onCancel,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{icon}{title}</h2>
        {!editing ? (
          <button className="btn-link" onClick={onEdit}>
            <Pencil size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} /> edit
          </button>
        ) : (
          <button className="btn-link" onClick={onCancel}>done</button>
        )}
      </div>
      {children}
    </div>
  );
}

function StringListEditor({
  placeholder,
  values,
  onChange,
}: {
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");
  return (
    <>
      <input
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            e.preventDefault();
            onChange([...values, text.trim()]);
            setText("");
          }
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {values.map((v, i) => (
          <div key={i} className="chip sel">
            {v}
            <X size={12} style={{ cursor: "pointer" }} onClick={() => onChange(values.filter((_, idx) => idx !== i))} />
          </div>
        ))}
        {values.length === 0 && <span className="sub" style={{ margin: 0 }}>none yet</span>}
      </div>
    </>
  );
}

export default function ProfilePage() {
  const {
    state,
    currentProfile,
    savePersonaStep1,
    saveAllergies,
    saveAvoidances,
    saveWeeklySchedule,
    saveLikesDislikes,
    saveHealthConditions,
    saveVitaminAnomalies,
    saveTypicalMeals,
    setAccessibility,
  } = useStore();

  const [editing, setEditing] = useState<string | null>(null);
  const [prefSection, setPrefSection] = useState<DishSection>("breakfast");
  const [swiping, setSwiping] = useState(false);

  // identity
  const [name, setName] = useState(currentProfile?.name ?? "");
  const [age, setAge] = useState(currentProfile?.age?.toString() ?? "");
  const [weight, setWeight] = useState(currentProfile?.weight?.toString() ?? "");
  const [proteinTarget, setProteinTarget] = useState(currentProfile?.protein_target_g?.toString() ?? "");
  const [goal, setGoal] = useState(currentProfile?.goal ?? GOALS[0]);
  const [engagement, setEngagement] = useState<"planner" | "quick">(currentProfile?.engagement_style ?? "planner");

  // allergies / avoidances / likes / dislikes
  const myAllergies = state.allergies.filter((a) => a.profile_id === currentProfile?.id).map((a) => a.name);
  const myAvoidances = state.avoidances.filter((a) => a.profile_id === currentProfile?.id).map((a) => a.name);
  const myLikes = state.likesDislikes.filter((l) => l.profile_id === currentProfile?.id && l.sentiment === "like").map((l) => l.term);
  const myDislikes = state.likesDislikes.filter((l) => l.profile_id === currentProfile?.id && l.sentiment === "dislike").map((l) => l.term);
  const [allergyDraft, setAllergyDraft] = useState<string[]>(myAllergies);
  const [avoidanceDraft, setAvoidanceDraft] = useState<string[]>(myAvoidances);
  const [likesDraft, setLikesDraft] = useState<string[]>(myLikes);
  const [dislikesDraft, setDislikesDraft] = useState<string[]>(myDislikes);

  // weekly schedule
  interface DaySchedule { veg: boolean; nonveg: boolean; nonvegSubtype: string | null; fasting: boolean }
  function scheduleFromState(): Record<number, DaySchedule> {
    const out: Record<number, DaySchedule> = {};
    for (const e of state.weeklySchedule) {
      if (e.profile_id !== currentProfile?.id) continue;
      const cur = out[e.day_of_week] ?? { veg: false, nonveg: false, nonvegSubtype: null, fasting: false };
      if (e.type === "veg") cur.veg = true;
      if (e.type === "nonveg") { cur.nonveg = true; cur.nonvegSubtype = e.nonveg_subtype; }
      if (e.type === "fasting") cur.fasting = true;
      out[e.day_of_week] = cur;
    }
    return out;
  }
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(scheduleFromState);
  function daySchedule(i: number): DaySchedule {
    return schedule[i] ?? { veg: false, nonveg: false, nonvegSubtype: null, fasting: false };
  }
  function setDay(i: number, fields: Partial<DaySchedule>) {
    setSchedule((s) => ({ ...s, [i]: { ...daySchedule(i), ...fields } }));
  }

  // typical meals (household-level, add-only)
  const [typicalMeals, setTypicalMeals] = useState<Record<"breakfast" | "lunch" | "dinner", string[]>>({
    breakfast: [], lunch: [], dinner: [],
  });
  const baselineRecipes = state.recipes.filter((r) => r.is_baseline_item && r.home_id === state.home?.id);

  // health / vitamins
  const myHealth = state.healthConditions.filter((h) => h.profile_id === currentProfile?.id);
  const myVma = state.vitaminAnomalies.filter((v) => v.profile_id === currentProfile?.id);
  const [healthDraft, setHealthDraft] = useState(myHealth.map((h) => ({ name: h.name, is_private: h.is_private })));
  const [vmaDraft, setVmaDraft] = useState(myVma.map((v) => ({ nutrient: v.nutrient, status: v.status, is_private: v.is_private })));
  const [healthInput, setHealthInput] = useState("");
  const [healthPrivate, setHealthPrivate] = useState(true);
  const [vmaNutrient, setVmaNutrient] = useState("");
  const [vmaStatus, setVmaStatus] = useState<"deficient" | "elevated">("deficient");

  if (!currentProfile) return null;

  function openEdit(key: string) {
    setEditing(key);
    if (key === "identity") {
      setName(currentProfile!.name);
      setAge(currentProfile!.age?.toString() ?? "");
      setWeight(currentProfile!.weight?.toString() ?? "");
      setProteinTarget(currentProfile!.protein_target_g?.toString() ?? "");
      setGoal(currentProfile!.goal ?? GOALS[0]);
      setEngagement(currentProfile!.engagement_style ?? "planner");
    }
    if (key === "allergies") setAllergyDraft(myAllergies);
    if (key === "avoidances") setAvoidanceDraft(myAvoidances);
    if (key === "likes") { setLikesDraft(myLikes); setDislikesDraft(myDislikes); }
    if (key === "schedule") setSchedule(scheduleFromState());
    if (key === "health") setHealthDraft(myHealth.map((h) => ({ name: h.name, is_private: h.is_private })));
    if (key === "vma") setVmaDraft(myVma.map((v) => ({ nutrient: v.nutrient, status: v.status, is_private: v.is_private })));
  }

  function saveIdentity() {
    savePersonaStep1({
      name,
      age: age ? Number(age) : null,
      weight: weight ? Number(weight) : null,
      protein_target_g: proteinTarget ? Number(proteinTarget) : null,
      goal,
      engagement_style: engagement,
    });
    setEditing(null);
  }
  function saveAllergiesSection() { saveAllergies(allergyDraft); setEditing(null); }
  function saveAvoidancesSection() { saveAvoidances(avoidanceDraft); setEditing(null); }
  function saveLikesSection() {
    saveLikesDislikes([
      ...likesDraft.map((term) => ({ term, sentiment: "like" as const })),
      ...dislikesDraft.map((term) => ({ term, sentiment: "dislike" as const })),
    ]);
    setEditing(null);
  }
  function saveScheduleSection() {
    const entries: { day_of_week: number; type: ScheduleDayType; nonveg_subtype: string | null }[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = daySchedule(d);
      if (ds.veg) entries.push({ day_of_week: d, type: "veg", nonveg_subtype: null });
      if (ds.nonveg) entries.push({ day_of_week: d, type: "nonveg", nonveg_subtype: ds.nonvegSubtype });
      if (ds.fasting) entries.push({ day_of_week: d, type: "fasting", nonveg_subtype: null });
    }
    saveWeeklySchedule(entries);
    setEditing(null);
  }
  function saveTypicalMealsSection() {
    const entries = MEAL_TYPES.flatMap(({ key }) => typicalMeals[key].map((mealName) => ({ mealType: key, name: mealName })));
    if (entries.length) saveTypicalMeals(entries);
    setTypicalMeals({ breakfast: [], lunch: [], dinner: [] });
    setEditing(null);
  }
  function addHealthDraft() {
    if (!healthInput.trim()) return;
    setHealthDraft((l) => [...l, { name: healthInput.trim(), is_private: healthPrivate }]);
    setHealthInput("");
  }
  function saveHealthSection() { saveHealthConditions(healthDraft); setEditing(null); }
  function addVmaDraft() {
    if (!vmaNutrient.trim()) return;
    setVmaDraft((l) => [...l, { nutrient: vmaNutrient.trim(), status: vmaStatus, is_private: true }]);
    setVmaNutrient("");
  }
  function saveVmaSection() { saveVitaminAnomalies(vmaDraft); setEditing(null); }

  const nonvegDays = Object.entries(schedule).filter(([, ds]) => ds.nonveg);

  return (
    <div>
      <h1><UserRound size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> My profile</h1>
      <p className="sub">Everything from onboarding, editable any time. Health data stays private unless you mark it shared.</p>

      {/* identity */}
      <Section title="Identity & goals" editing={editing === "identity"} onEdit={() => openEdit("identity")} onCancel={saveIdentity}>
        {editing === "identity" ? (
          <>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <label>Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
            <label>Weight (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <label>Daily protein target (g)</label>
            <input type="number" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} />
            <label>Goal</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {GOALS.map((g) => (
                <div key={g} className={`chip ${goal === g ? "sel" : ""}`} onClick={() => setGoal(g)}>{g}</div>
              ))}
            </div>
            <label>Engagement style</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div className={`chip ${engagement === "planner" ? "sel" : ""}`} onClick={() => setEngagement("planner")}>Planner</div>
              <div className={`chip ${engagement === "quick" ? "sel" : ""}`} onClick={() => setEngagement("quick")}>Quick decisions</div>
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={saveIdentity}>save</button>
          </>
        ) : (
          <>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Name</span><span>{currentProfile.name}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Age</span><span>{currentProfile.age ?? "not set"}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Weight</span><span>{currentProfile.weight ? `${currentProfile.weight} kg` : "not set"}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Protein target</span><span>{currentProfile.protein_target_g ? `${currentProfile.protein_target_g} g/day` : "not set"}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Goal</span><span>{currentProfile.goal ?? "not set"}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Engagement style</span><span>{currentProfile.engagement_style === "quick" ? "Quick decisions" : currentProfile.engagement_style === "planner" ? "Planner" : "not set"}</span></div>
          </>
        )}
      </Section>

      {/* allergies */}
      <Section title="Allergies · hard constraint" editing={editing === "allergies"} onEdit={() => openEdit("allergies")} onCancel={saveAllergiesSection}>
        {editing === "allergies" ? (
          <>
            <StringListEditor placeholder="Type and press enter, e.g. peanuts" values={allergyDraft} onChange={setAllergyDraft} />
            <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={saveAllergiesSection}>save</button>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {myAllergies.length === 0 && <span className="sub" style={{ margin: 0 }}>none set</span>}
            {myAllergies.map((a) => <span className="chip allergy" key={a}>{a}</span>)}
          </div>
        )}
      </Section>

      {/* avoidances */}
      <Section title="Avoidances · soft constraint" editing={editing === "avoidances"} onEdit={() => openEdit("avoidances")} onCancel={saveAvoidancesSection}>
        {editing === "avoidances" ? (
          <>
            <StringListEditor placeholder="Type and press enter, e.g. mushroom" values={avoidanceDraft} onChange={setAvoidanceDraft} />
            <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={saveAvoidancesSection}>save</button>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {myAvoidances.length === 0 && <span className="sub" style={{ margin: 0 }}>none set</span>}
            {myAvoidances.map((a) => <span className="chip sel" key={a}>{a}</span>)}
          </div>
        )}
      </Section>

      {/* weekly schedule */}
      <Section title="Weekly schedule" editing={editing === "schedule"} onEdit={() => openEdit("schedule")} onCancel={saveScheduleSection}>
        {editing === "schedule" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "70px repeat(7,1fr)", gap: 5, alignItems: "center", fontSize: 11 }}>
              <div></div>
              {DAYS.map((d) => <div key={d} style={{ textAlign: "center", color: "var(--ink2)" }}>{d}</div>)}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Leaf size={12} color="var(--sage)" />Veg</div>
              {DAYS.map((_, i) => (
                <div key={i} onClick={() => setDay(i, { veg: !daySchedule(i).veg })}
                  style={{ height: 28, borderRadius: 6, border: "0.5px solid var(--bd)", cursor: "pointer", background: daySchedule(i).veg ? "var(--sage)" : "var(--surf)" }} />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Drumstick size={12} color="var(--brick)" />Non-veg</div>
              {DAYS.map((_, i) => (
                <div key={i} onClick={() => setDay(i, { nonveg: !daySchedule(i).nonveg })}
                  style={{ height: 28, borderRadius: 6, border: "0.5px solid var(--bd)", cursor: "pointer", background: daySchedule(i).nonveg ? "var(--brick)" : "var(--surf)" }} />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Moon size={12} color="var(--moon)" />Fasting</div>
              {DAYS.map((_, i) => (
                <div key={i} onClick={() => setDay(i, { fasting: !daySchedule(i).fasting })}
                  style={{ height: 28, borderRadius: 6, border: "0.5px solid var(--bd)", cursor: "pointer", background: daySchedule(i).fasting ? "var(--moon)" : "var(--surf)" }} />
              ))}
            </div>
            {nonvegDays.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {nonvegDays.map(([day]) => {
                  const i = Number(day);
                  return (
                    <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="sub" style={{ margin: 0, width: 30 }}>{DAYS[i]}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {NONVEG_SUBTYPES.map((t) => (
                          <div key={t} className={`chip ${daySchedule(i).nonvegSubtype === t ? "sel" : ""}`} onClick={() => setDay(i, { nonvegSubtype: t })}>{t}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={saveScheduleSection}>save</button>
          </>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            {Object.keys(scheduleFromState()).length === 0
              ? "not set"
              : Object.entries(scheduleFromState()).map(([d, ds]) => {
                  const parts = [ds.veg && "veg", ds.nonveg && `non-veg${ds.nonvegSubtype ? ` (${ds.nonvegSubtype})` : ""}`, ds.fasting && "fasting"].filter(Boolean);
                  return `${DAYS[Number(d)]}: ${parts.join(", ")}`;
                }).join(" · ")}
          </p>
        )}
      </Section>

      {/* typical meals — household-level */}
      <Section title="Typical meals · shared by the whole household" editing={editing === "typical"} onEdit={() => openEdit("typical")} onCancel={saveTypicalMealsSection}>
        {editing === "typical" ? (
          <>
            {MEAL_TYPES.map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <StringListEditor
                  placeholder={`Add a ${label.toLowerCase()} dish`}
                  values={typicalMeals[key]}
                  onChange={(next) => setTypicalMeals((m) => ({ ...m, [key]: next }))}
                />
              </div>
            ))}
            <button className="btn-primary" style={{ width: "100%" }} onClick={saveTypicalMealsSection}>save</button>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {baselineRecipes.length === 0 && <span className="sub" style={{ margin: 0 }}>not set</span>}
            {baselineRecipes.map((r) => <span className="chip sel" key={r.id}>{r.name}</span>)}
          </div>
        )}
      </Section>

      {/* dish preferences — whole-dish swipe ratings, distinct from
          ingredient-level likes/dislikes below */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Food preferences</h2>
          {!swiping && (
            <button className="btn-link" onClick={() => setSwiping(true)}>
              <Pencil size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} /> rate more
            </button>
          )}
        </div>
        {swiping ? (
          <>
            <DishSwiper onDone={() => setSwiping(false)} />
            <button className="btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => setSwiping(false)}>done for now</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {DISH_SECTIONS.map((s) => (
                <div
                  key={s.key}
                  className="chip"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    textAlign: "center",
                    background: prefSection === s.key ? "var(--sage-deep)" : "var(--surf)",
                    color: prefSection === s.key ? "var(--surf)" : "var(--ink2)",
                  }}
                  onClick={() => setPrefSection(s.key)}
                >
                  {s.label}
                </div>
              ))}
            </div>
            {(() => {
              const myRatings = state.dishRatings.filter((d) => d.profile_id === currentProfile.id);
              const sectionRecipes = state.recipes.filter((r) => sectionForRecipe(r) === prefSection);
              const rated = sectionRecipes
                .map((r) => ({ recipe: r, rating: myRatings.find((d) => d.recipe_id === r.id)?.rating }))
                .filter((x): x is { recipe: typeof x.recipe; rating: NonNullable<typeof x.rating> } => Boolean(x.rating));
              const groups: { key: "loved" | "liked" | "disliked"; label: string; icon: React.ReactNode }[] = [
                { key: "loved", label: "Loved", icon: <Heart size={13} color="var(--brick)" /> },
                { key: "liked", label: "Liked", icon: <ThumbsUp size={13} color="var(--sage-deep)" /> },
                { key: "disliked", label: "Disliked", icon: <ThumbsDown size={13} color="var(--ink2)" /> },
              ];
              if (rated.length === 0) {
                return <p className="sub" style={{ margin: 0 }}>Nothing rated in this section yet.</p>;
              }
              return groups.map((g) => {
                const items = rated.filter((r) => r.rating === g.key);
                if (items.length === 0) return null;
                return (
                  <div key={g.key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--ink2)", marginBottom: 6 }}>
                      {g.icon} {g.label.toUpperCase()}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {items.map(({ recipe }) => (
                        <span className="chip sel" key={recipe.id}>{recipe.name}</span>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </>
        )}
      </div>

      {/* likes / dislikes */}
      <Section title="Likes & dislikes" editing={editing === "likes"} onEdit={() => openEdit("likes")} onCancel={saveLikesSection}>
        {editing === "likes" ? (
          <>
            <label>Likes</label>
            <StringListEditor placeholder="e.g. paneer, lemon" values={likesDraft} onChange={setLikesDraft} />
            <label style={{ marginTop: 10 }}>Dislikes</label>
            <StringListEditor placeholder="e.g. mushroom" values={dislikesDraft} onChange={setDislikesDraft} />
            <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={saveLikesSection}>save</button>
          </>
        ) : (
          <>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Likes</span><span>{myLikes.join(", ") || "not set"}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Dislikes</span><span>{myDislikes.join(", ") || "not set"}</span></div>
          </>
        )}
      </Section>

      {/* health conditions */}
      <Section title="Health conditions · private by default" editing={editing === "health"} onEdit={() => openEdit("health")} onCancel={saveHealthSection}>
        {editing === "health" ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input placeholder="e.g. PCOS" value={healthInput} onChange={(e) => setHealthInput(e.target.value)} style={{ flex: 1, marginBottom: 0 }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHealthDraft())} />
              <button className="btn-ghost" type="button" onClick={addHealthDraft}>add</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input type="checkbox" style={{ width: "auto", minHeight: "auto", marginBottom: 0 }} checked={healthPrivate} onChange={(e) => setHealthPrivate(e.target.checked)} />
              <span className="sub" style={{ margin: 0 }}>Keep new entries private</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {healthDraft.map((h, i) => (
                <div key={i} className="chip sel">
                  {h.name} · {h.is_private ? "private" : "shared"}
                  <X size={12} style={{ cursor: "pointer" }} onClick={() => setHealthDraft((l) => l.filter((_, idx) => idx !== i))} />
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={saveHealthSection}>save</button>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {myHealth.length === 0 && <span className="sub" style={{ margin: 0 }}>not set</span>}
            {myHealth.map((h) => <span className="chip sel" key={h.id}>{h.name} · {h.is_private ? "private" : "shared"}</span>)}
          </div>
        )}
      </Section>

      {/* vitamin / mineral */}
      <Section title="Vitamin / mineral anomalies · private by default" editing={editing === "vma"} onEdit={() => openEdit("vma")} onCancel={saveVmaSection}>
        {editing === "vma" ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input placeholder="e.g. Vitamin D" value={vmaNutrient} onChange={(e) => setVmaNutrient(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
              <select value={vmaStatus} onChange={(e) => setVmaStatus(e.target.value as "deficient" | "elevated")} style={{ width: 120, marginBottom: 0 }}>
                <option value="deficient">deficient</option>
                <option value="elevated">elevated</option>
              </select>
              <button className="btn-ghost" type="button" onClick={addVmaDraft}>add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {vmaDraft.map((v, i) => (
                <div key={i} className="chip sel">
                  {v.nutrient} · {v.status}
                  <X size={12} style={{ cursor: "pointer" }} onClick={() => setVmaDraft((l) => l.filter((_, idx) => idx !== i))} />
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={saveVmaSection}>save</button>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {myVma.length === 0 && <span className="sub" style={{ margin: 0 }}>not set</span>}
            {myVma.map((v) => <span className="chip sel" key={v.id}>{v.nutrient} · {v.status} · {v.is_private ? "private" : "shared"}</span>)}
          </div>
        )}
      </Section>

      {/* accessibility — saves immediately, no edit toggle needed */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Accessibility</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
          <input
            type="checkbox"
            style={{ width: "auto", minHeight: "auto", marginBottom: 0 }}
            checked={currentProfile.accessibility.colorblind_safe}
            onChange={(e) => setAccessibility({ colorblind_safe: e.target.checked })}
          />
          <span style={{ fontSize: 13 }}>Colorblind-safe mode</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
          <input
            type="checkbox"
            style={{ width: "auto", minHeight: "auto", marginBottom: 0 }}
            checked={currentProfile.accessibility.larger_text}
            onChange={(e) => setAccessibility({ larger_text: e.target.checked })}
          />
          <span style={{ fontSize: 13 }}>Larger text</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Leaf, Drumstick, Moon } from "lucide-react";
import { useStore } from "@/lib/store";
import { nextRouteFor } from "@/lib/store/routing";
import type { MealSlot } from "@/lib/types";

const GOALS = ["PCOS management", "Weight loss", "Muscle gain", "Maintenance"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NONVEG_SUBTYPES = ["chicken", "fish", "mutton", "egg", "other"];
const MEAL_TYPES: { key: MealSlot["meal_type"]; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

interface DaySchedule {
  veg: boolean;
  nonveg: boolean;
  nonvegSubtype: string | null;
  fasting: boolean;
}

function ChipInput({
  label,
  hint,
  placeholder,
  values,
  onAdd,
  onRemove,
  variant,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  variant?: "allergy";
}) {
  const [text, setText] = useState("");
  return (
    <>
      <label>{label}</label>
      {hint && <p className="sub" style={{ margin: "0 0 8px" }}>{hint}</p>}
      <input
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            e.preventDefault();
            onAdd(text.trim());
            setText("");
          }
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 4px" }}>
        {values.map((v, i) => (
          <div key={i} className={`chip ${variant === "allergy" ? "allergy" : "sel"}`}>
            {v} <X size={12} style={{ cursor: "pointer" }} onClick={() => onRemove(i)} />
          </div>
        ))}
      </div>
    </>
  );
}

function StepHeader({ step, total, required }: { step: number; total: number; required: boolean }) {
  return (
    <>
      <div style={{ marginBottom: 6, display: "flex", gap: 5 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="dot" style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? "var(--sage)" : "var(--bd)" }} />
        ))}
      </div>
      <p className="sub" style={{ margin: "0 0 14px" }}>
        step {step} of {total} ·{" "}
        {required ? <b style={{ color: "var(--brick)" }}>required</b> : <span>optional — skip any time</span>}
      </p>
    </>
  );
}

export default function PersonaOnboardingPage() {
  const router = useRouter();
  const {
    state,
    currentProfile,
    savePersonaStep1,
    saveAllergies,
    saveAvoidances,
    saveWeeklySchedule,
    saveTypicalMeals,
    saveLikesDislikes,
    saveHealthConditions,
    saveVitaminAnomalies,
    setAccessibility,
    completeOnboarding,
  } = useStore();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 10;

  // step 1 — identity
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [engagement, setEngagement] = useState<"planner" | "quick">("planner");

  // step 2 — allergies
  const [allergyList, setAllergyList] = useState<string[]>([]);

  // step 3 — avoidances
  const [avoidanceList, setAvoidanceList] = useState<string[]>([]);
  const [avoidanceSkipped, setAvoidanceSkipped] = useState(false);

  // step 4 — weekly schedule
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
  const [scheduleSkipped, setScheduleSkipped] = useState(false);

  // step 5 — typical meals
  const [typicalMeals, setTypicalMeals] = useState<Record<MealSlot["meal_type"], string[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });
  const [typicalSkipped, setTypicalSkipped] = useState(false);

  // step 6 — likes/dislikes
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [likesSkipped, setLikesSkipped] = useState(false);

  // step 7 — health conditions
  const [healthList, setHealthList] = useState<{ name: string; is_private: boolean }[]>([]);
  const [healthPrivate, setHealthPrivate] = useState(true);
  const [healthSkipped, setHealthSkipped] = useState(false);

  // step 8 — vitamin/mineral anomalies
  const [vmaList, setVmaList] = useState<{ nutrient: string; status: "deficient" | "elevated"; is_private: boolean }[]>([]);
  const [vmaSkipped, setVmaSkipped] = useState(false);

  // step 9 — accessibility
  const [colorblind, setColorblind] = useState(false);
  const [largerText, setLargerText] = useState(false);
  const [accessibilitySkipped, setAccessibilitySkipped] = useState(false);

  useEffect(() => {
    const next = nextRouteFor(state);
    if (next && next !== "/onboarding/persona") router.replace(next);
  }, [state, router]);

  if (!currentProfile) return null;

  function daySchedule(i: number): DaySchedule {
    return schedule[i] ?? { veg: false, nonveg: false, nonvegSubtype: null, fasting: false };
  }
  function setDay(i: number, fields: Partial<DaySchedule>) {
    setSchedule((s) => ({ ...s, [i]: { ...daySchedule(i), ...fields } }));
  }

  function goStep2() {
    savePersonaStep1({ age: age ? Number(age) : null, weight: weight ? Number(weight) : null, goal, engagement_style: engagement });
    setStep(2);
  }
  function goStep3() {
    saveAllergies(allergyList);
    setStep(3);
  }
  function goStep4() {
    saveAvoidances(avoidanceSkipped ? [] : avoidanceList);
    setStep(4);
  }
  function goStep5() {
    if (!scheduleSkipped) {
      const entries: { day_of_week: number; type: "veg" | "nonveg" | "fasting"; nonveg_subtype: string | null }[] = [];
      for (let d = 0; d < 7; d++) {
        const ds = daySchedule(d);
        if (ds.veg) entries.push({ day_of_week: d, type: "veg", nonveg_subtype: null });
        if (ds.nonveg) entries.push({ day_of_week: d, type: "nonveg", nonveg_subtype: ds.nonvegSubtype });
        if (ds.fasting) entries.push({ day_of_week: d, type: "fasting", nonveg_subtype: null });
      }
      saveWeeklySchedule(entries);
    }
    setStep(5);
  }
  function goStep6() {
    if (!typicalSkipped) {
      const entries = MEAL_TYPES.flatMap(({ key }) => typicalMeals[key].map((name) => ({ mealType: key, name })));
      if (entries.length) saveTypicalMeals(entries);
    }
    setStep(6);
  }
  function goStep7() {
    if (!likesSkipped) {
      saveLikesDislikes([
        ...likes.map((term) => ({ term, sentiment: "like" as const })),
        ...dislikes.map((term) => ({ term, sentiment: "dislike" as const })),
      ]);
    }
    setStep(7);
  }
  function goStep8() {
    saveHealthConditions(healthSkipped ? [] : healthList);
    setStep(8);
  }
  function goStep9() {
    saveVitaminAnomalies(vmaSkipped ? [] : vmaList);
    setStep(9);
  }
  function goStep10() {
    if (!accessibilitySkipped) setAccessibility({ colorblind_safe: colorblind, larger_text: largerText });
    setStep(10);
  }
  function finish() {
    completeOnboarding();
    router.push("/");
  }

  const nonvegDays = Object.entries(schedule).filter(([, ds]) => ds.nonveg);

  return (
    <div className="mx-auto max-w-[440px] px-6 py-10">
      {step === 1 && (
        <>
          <StepHeader step={1} total={TOTAL_STEPS} required />
          <h1>Tell us about you, {currentProfile.name}</h1>
          <p className="sub">Goal and how you like to plan — this shapes every suggestion after.</p>
          <label>Age</label>
          <input type="number" placeholder="29" value={age} onChange={(e) => setAge(e.target.value)} />
          <label>Weight (kg)</label>
          <input type="number" placeholder="62" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <label>Your goal</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 4px" }}>
            {GOALS.map((g) => (
              <div key={g} className={`chip ${goal === g ? "sel" : ""}`} onClick={() => setGoal(g)}>{g}</div>
            ))}
          </div>
          <label>How do you like to plan?</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 4px" }}>
            <div className={`chip ${engagement === "planner" ? "sel" : ""}`} onClick={() => setEngagement("planner")}>I like planning ahead</div>
            <div className={`chip ${engagement === "quick" ? "sel" : ""}`} onClick={() => setEngagement("quick")}>I want quick answers</div>
          </div>
          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button className="btn-primary" onClick={goStep2}>continue</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={TOTAL_STEPS} required />
          <h1>Anything you can&apos;t eat?</h1>
          <ChipInput
            label="Allergies"
            hint="Hard constraint — never overridden by suggestions, ever."
            placeholder="Type and press enter, e.g. peanuts"
            values={allergyList}
            onAdd={(v) => setAllergyList((l) => [...l, v])}
            onRemove={(i) => setAllergyList((l) => l.filter((_, idx) => idx !== i))}
            variant="allergy"
          />
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(1)}>back</button>
            <button className="btn-primary" onClick={goStep3}>continue</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={TOTAL_STEPS} required={false} />
          <h1>Anything you&apos;d rather avoid?</h1>
          <ChipInput
            label="Avoidances"
            hint="Soft constraint — can flex when nothing else fits; any flex gets logged, not blocked."
            placeholder="Type and press enter, e.g. mushroom"
            values={avoidanceList}
            onAdd={(v) => { setAvoidanceList((l) => [...l, v]); setAvoidanceSkipped(false); }}
            onRemove={(i) => setAvoidanceList((l) => l.filter((_, idx) => idx !== i))}
          />
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(2)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setAvoidanceSkipped(true); goStep4(); }}>skip</button>
              <button className="btn-primary" onClick={goStep4}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeader step={4} total={TOTAL_STEPS} required={false} />
          <h1>Any recurring days?</h1>
          <p className="sub">Three independent rows — a day can be any combination. Icons distinguish rows, not just color.</p>
          <div style={{ display: "grid", gridTemplateColumns: "90px repeat(7,1fr)", gap: 5, alignItems: "center", fontSize: 11 }}>
            <div></div>
            {DAYS.map((d) => <div key={d} style={{ textAlign: "center", color: "var(--ink2)" }}>{d}</div>)}

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Leaf size={13} color="var(--sage)" />Veg</div>
            {DAYS.map((_, i) => (
              <div key={i} onClick={() => setDay(i, { veg: !daySchedule(i).veg })}
                style={{ height: 30, borderRadius: 7, border: "0.5px solid var(--bd)", cursor: "pointer", background: daySchedule(i).veg ? "var(--sage)" : "var(--surf)" }} />
            ))}

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Drumstick size={13} color="var(--brick)" />Non-veg</div>
            {DAYS.map((_, i) => (
              <div key={i} onClick={() => setDay(i, { nonveg: !daySchedule(i).nonveg })}
                style={{ height: 30, borderRadius: 7, border: "0.5px solid var(--bd)", cursor: "pointer", background: daySchedule(i).nonveg ? "var(--brick)" : "var(--surf)" }} />
            ))}

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Moon size={13} color="var(--moon)" />Fasting</div>
            {DAYS.map((_, i) => (
              <div key={i} onClick={() => setDay(i, { fasting: !daySchedule(i).fasting })}
                style={{ height: 30, borderRadius: 7, border: "0.5px solid var(--bd)", cursor: "pointer", background: daySchedule(i).fasting ? "var(--moon)" : "var(--surf)" }} />
            ))}
          </div>

          {nonvegDays.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <label>What kind, on your non-veg days?</label>
              {nonvegDays.map(([day]) => {
                const i = Number(day);
                return (
                  <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="sub" style={{ margin: 0, width: 34 }}>{DAYS[i]}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {NONVEG_SUBTYPES.map((t) => (
                        <div key={t} className={`chip ${daySchedule(i).nonvegSubtype === t ? "sel" : ""}`} onClick={() => setDay(i, { nonvegSubtype: t })}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(3)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setScheduleSkipped(true); goStep5(); }}>skip</button>
              <button className="btn-primary" onClick={goStep5}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <StepHeader step={5} total={TOTAL_STEPS} required={false} />
          <h1>What do you normally eat?</h1>
          <p className="sub">This seeds day-one suggestions with your household&apos;s real repertoire, not generic recipes.</p>
          {MEAL_TYPES.map(({ key, label }) => (
            <ChipInput
              key={key}
              label={label}
              placeholder={`Add a ${label.toLowerCase()} dish and press enter`}
              values={typicalMeals[key]}
              onAdd={(v) => { setTypicalMeals((m) => ({ ...m, [key]: [...m[key], v] })); setTypicalSkipped(false); }}
              onRemove={(i) => setTypicalMeals((m) => ({ ...m, [key]: m[key].filter((_, idx) => idx !== i) }))}
            />
          ))}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(4)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setTypicalSkipped(true); goStep6(); }}>skip</button>
              <button className="btn-primary" onClick={goStep6}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <StepHeader step={6} total={TOTAL_STEPS} required={false} />
          <h1>Likes &amp; dislikes</h1>
          <p className="sub">Flavor/ingredient preferences — separate from whole dishes, refined further as you give feedback.</p>
          <ChipInput
            label="Likes"
            placeholder="e.g. paneer, lemon, spicy"
            values={likes}
            onAdd={(v) => { setLikes((l) => [...l, v]); setLikesSkipped(false); }}
            onRemove={(i) => setLikes((l) => l.filter((_, idx) => idx !== i))}
          />
          <ChipInput
            label="Dislikes"
            placeholder="e.g. mushroom, bitter gourd"
            values={dislikes}
            onAdd={(v) => { setDislikes((l) => [...l, v]); setLikesSkipped(false); }}
            onRemove={(i) => setDislikes((l) => l.filter((_, idx) => idx !== i))}
          />
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(5)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setLikesSkipped(true); goStep7(); }}>skip</button>
              <button className="btn-primary" onClick={goStep7}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 7 && (
        <>
          <StepHeader step={7} total={TOTAL_STEPS} required={false} />
          <h1>Health conditions</h1>
          <p className="sub">Private by default — enforced at the database level, not just hidden in the UI. Opt in to share per entry.</p>
          <label>Condition</label>
          <input
            placeholder="Type and press enter, e.g. PCOS"
            onKeyDown={(e) => {
              const el = e.currentTarget;
              if (e.key === "Enter" && el.value.trim()) {
                e.preventDefault();
                setHealthList((l) => [...l, { name: el.value.trim(), is_private: healthPrivate }]);
                setHealthSkipped(false);
                el.value = "";
              }
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input type="checkbox" style={{ width: "auto", minHeight: "auto", marginBottom: 0 }} checked={healthPrivate} onChange={(e) => setHealthPrivate(e.target.checked)} />
            <span className="sub" style={{ margin: 0 }}>Keep new entries private from household</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {healthList.map((h, i) => (
              <div key={i} className="chip sel">
                {h.name} · {h.is_private ? "private" : "shared"}
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setHealthList((l) => l.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(6)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setHealthSkipped(true); goStep8(); }}>skip</button>
              <button className="btn-primary" onClick={goStep8}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 8 && (
        <>
          <StepHeader step={8} total={TOTAL_STEPS} required={false} />
          <h1>Vitamin / mineral anomalies</h1>
          <p className="sub">Same private-by-default treatment as health conditions.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input id="vma-nutrient" placeholder="Nutrient, e.g. Vitamin D" style={{ flex: 1, marginBottom: 0 }} />
            <select id="vma-status" style={{ width: 130, marginBottom: 0 }}>
              <option value="deficient">deficient</option>
              <option value="elevated">elevated</option>
            </select>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const nutrientEl = document.getElementById("vma-nutrient") as HTMLInputElement;
                const statusEl = document.getElementById("vma-status") as HTMLSelectElement;
                if (!nutrientEl.value.trim()) return;
                setVmaList((l) => [...l, { nutrient: nutrientEl.value.trim(), status: statusEl.value as "deficient" | "elevated", is_private: true }]);
                setVmaSkipped(false);
                nutrientEl.value = "";
              }}
            >
              add
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {vmaList.map((v, i) => (
              <div key={i} className="chip sel">
                {v.nutrient} · {v.status}
                <X size={12} style={{ cursor: "pointer" }} onClick={() => setVmaList((l) => l.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(7)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setVmaSkipped(true); goStep9(); }}>skip</button>
              <button className="btn-primary" onClick={goStep9}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 9 && (
        <>
          <StepHeader step={9} total={TOTAL_STEPS} required={false} />
          <h1>Accessibility</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
            <input type="checkbox" style={{ width: "auto", minHeight: "auto", marginBottom: 0 }} checked={colorblind}
              onChange={(e) => { setColorblind(e.target.checked); setAccessibilitySkipped(false); }} />
            <span style={{ fontSize: 13 }}>Colorblind-safe mode — status always shown with icon + text, not color alone</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
            <input type="checkbox" style={{ width: "auto", minHeight: "auto", marginBottom: 0 }} checked={largerText}
              onChange={(e) => { setLargerText(e.target.checked); setAccessibilitySkipped(false); }} />
            <span style={{ fontSize: 13 }}>Larger text</span>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(8)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => { setAccessibilitySkipped(true); goStep10(); }}>skip</button>
              <button className="btn-primary" onClick={goStep10}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 10 && (
        <>
          <StepHeader step={10} total={TOTAL_STEPS} required={false} />
          <h1>
            <Sparkles size={18} style={{ display: "inline", verticalAlign: -3, marginRight: 4 }} /> All set, {currentProfile.name}
          </h1>
          <p className="sub">Review before you go — edit any section, or head to your kitchen.</p>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Goal</span><span>{goal}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Engagement style</span><span>{engagement === "planner" ? "Planner" : "Quick decisions"}</span></div>
            <button className="btn-link" onClick={() => setStep(1)}>edit identity</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Allergies</span><span>{allergyList.join(", ") || "none"}</span></div>
            <button className="btn-link" onClick={() => setStep(2)}>edit allergies</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Avoidances</span><span>{avoidanceSkipped || !avoidanceList.length ? "not set — add later from your profile" : avoidanceList.join(", ")}</span></div>
            <button className="btn-link" onClick={() => setStep(3)}>edit avoidances</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Weekly schedule</span><span>{scheduleSkipped || nonvegDays.length + Object.values(schedule).filter((d) => d.veg || d.fasting).length === 0 ? "not set — add later from your profile" : "set"}</span></div>
            <button className="btn-link" onClick={() => setStep(4)}>edit schedule</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Typical meals</span><span>{typicalSkipped || Object.values(typicalMeals).every((v) => !v.length) ? "not set — add later from your profile" : "set"}</span></div>
            <button className="btn-link" onClick={() => setStep(5)}>edit typical meals</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Likes / dislikes</span><span>{likesSkipped || (!likes.length && !dislikes.length) ? "not set — add later from your profile" : "set"}</span></div>
            <button className="btn-link" onClick={() => setStep(6)}>edit likes</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Health conditions</span><span>{healthSkipped || !healthList.length ? "not set — add later from your profile" : `${healthList.length} added`}</span></div>
            <button className="btn-link" onClick={() => setStep(7)}>edit health</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Vitamin/mineral</span><span>{vmaSkipped || !vmaList.length ? "not set — add later from your profile" : `${vmaList.length} added`}</span></div>
            <button className="btn-link" onClick={() => setStep(8)}>edit vitamins</button>
          </div>

          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Accessibility</span><span>{accessibilitySkipped ? "not set — add later from your profile" : [colorblind && "colorblind-safe", largerText && "larger text"].filter(Boolean).join(", ") || "none"}</span></div>
            <button className="btn-link" onClick={() => setStep(9)}>edit accessibility</button>
          </div>

          <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={finish}>
            go to my kitchen →
          </button>
        </>
      )}
    </div>
  );
}

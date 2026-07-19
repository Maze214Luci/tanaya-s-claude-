"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import type { ScheduleDayType } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GOALS = ["PCOS management", "Weight loss", "Muscle gain", "Post-workout recovery", "General wellness"];

export default function PersonaOnboardingPage() {
  const router = useRouter();
  const { currentProfile, savePersonaStep1, saveAllergies, saveAvoidances, saveWeeklySchedule, saveHealthConditions, saveVitaminAnomalies, setAccessibility } = useStore();
  const [step, setStep] = useState(1);

  const [age, setAge] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [engagement, setEngagement] = useState<"planner" | "quick">("planner");

  const [allergyInput, setAllergyInput] = useState("");
  const [allergyList, setAllergyList] = useState<string[]>([]);
  const [avoidanceInput, setAvoidanceInput] = useState("");
  const [avoidanceList, setAvoidanceList] = useState<string[]>([]);

  const [schedule, setSchedule] = useState<Record<number, ScheduleDayType | "none">>({});
  const [healthInput, setHealthInput] = useState("");
  const [healthPrivate, setHealthPrivate] = useState(true);
  const [healthList, setHealthList] = useState<{ name: string; is_private: boolean }[]>([]);
  const [colorblind, setColorblind] = useState(false);

  if (!currentProfile) return null;

  function addAllergy() {
    if (!allergyInput.trim()) return;
    setAllergyList((l) => [...l, allergyInput.trim()]);
    setAllergyInput("");
  }
  function addAvoidance() {
    if (!avoidanceInput.trim()) return;
    setAvoidanceList((l) => [...l, avoidanceInput.trim()]);
    setAvoidanceInput("");
  }
  function addHealthCondition() {
    if (!healthInput.trim()) return;
    setHealthList((l) => [...l, { name: healthInput.trim(), is_private: healthPrivate }]);
    setHealthInput("");
  }
  function cycleDay(day: number) {
    setSchedule((s) => {
      const cur = s[day] ?? "none";
      const next = cur === "none" ? "veg" : cur === "veg" ? "fasting" : "none";
      return { ...s, [day]: next };
    });
  }

  function goStep2() {
    savePersonaStep1({
      age: age ? Number(age) : null,
      goal,
      engagement_style: engagement,
    });
    setStep(2);
  }

  function goStep3() {
    saveAllergies(allergyList);
    setStep(3);
  }

  function finish() {
    saveAvoidances(avoidanceList);
    saveWeeklySchedule(
      Object.entries(schedule)
        .filter(([, v]) => v !== "none")
        .map(([day, v]) => ({ day_of_week: Number(day), type: v as ScheduleDayType, nonveg_subtype: null }))
    );
    saveHealthConditions(healthList);
    saveVitaminAnomalies([]);
    setAccessibility({ colorblind_safe: colorblind });
    setStep(4);
  }

  const dots = [1, 2, 3, 4];

  return (
    <div className="mx-auto max-w-[420px] px-6 py-10">
      <div className="mb-1.5 flex gap-1.5">
        {dots.map((d) => (
          <div key={d} className="h-1 flex-1 rounded" style={{ background: d <= step ? "var(--sage)" : "var(--bd)" }} />
        ))}
      </div>

      {step === 1 && (
        <>
          <p className="stepnote sub">step 1 of 4 · <b style={{ color: "var(--brick)" }}>required: none extra</b></p>
          <h1>Tell us about you, {currentProfile.name}</h1>
          <p className="sub">Just the basics for now — you can add the rest later.</p>
          <label>Age (optional)</label>
          <input type="number" placeholder="29" value={age} onChange={(e) => setAge(e.target.value)} />
          <label>How do you like to plan?</label>
          <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 4px" }}>
            <div className={`chip ${engagement === "planner" ? "sel" : ""}`} onClick={() => setEngagement("planner")}>I like planning ahead</div>
            <div className={`chip ${engagement === "quick" ? "sel" : ""}`} onClick={() => setEngagement("quick")}>I want quick answers</div>
          </div>
          <label>Your goal</label>
          <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 4px" }}>
            {GOALS.map((g) => (
              <div key={g} className={`chip ${goal === g ? "sel" : ""}`} onClick={() => setGoal(g)}>
                {g}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button className="btn-primary" onClick={goStep2}>continue</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="stepnote sub">step 2 of 4 · <b style={{ color: "var(--brick)" }}>required</b></p>
          <h1>Anything you can&apos;t eat?</h1>
          <p className="sub">Allergies are hard constraints — never overridden by suggestions.</p>
          <label>Allergies</label>
          <input
            placeholder="Type and press enter, e.g. peanuts"
            value={allergyInput}
            onChange={(e) => setAllergyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
          />
          <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 4px" }}>
            {allergyList.map((a, i) => (
              <div key={i} className="chip allergy">
                {a} <X size={12} onClick={() => setAllergyList((l) => l.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(1)}>back</button>
            <button className="btn-primary" onClick={goStep3}>continue</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="stepnote sub">step 3 of 4 · <span style={{ color: "var(--ink2)" }}>optional — skip any of this</span></p>
          <h1>Anything else worth knowing?</h1>
          <p className="sub">Soft avoidances, recurring days, health context. All private by default, all skippable.</p>

          <label>Soft avoidances (can flex when nothing else fits)</label>
          <input
            placeholder="Type and press enter, e.g. mushroom"
            value={avoidanceInput}
            onChange={(e) => setAvoidanceInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAvoidance())}
          />
          <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 12px" }}>
            {avoidanceList.map((a, i) => (
              <div key={i} className="chip sel">
                {a} <X size={12} onClick={() => setAvoidanceList((l) => l.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>

          <label>Recurring days — tap to cycle none / veg / fasting</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {DAYS.map((d, i) => {
              const v = schedule[i] ?? "none";
              const bg = v === "veg" ? "var(--sage)" : v === "fasting" ? "var(--moon)" : "var(--surf)";
              return (
                <div key={d} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--ink2)", marginBottom: 3 }}>{d}</div>
                  <div
                    onClick={() => cycleDay(i)}
                    style={{ height: 32, borderRadius: 8, border: "0.5px solid var(--bd)", background: bg, cursor: "pointer" }}
                  />
                </div>
              );
            })}
          </div>

          <label style={{ marginTop: 16 }}>Health conditions (private by default — opt in to share)</label>
          <input
            placeholder="Type and press enter, e.g. PCOS"
            value={healthInput}
            onChange={(e) => setHealthInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHealthCondition())}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              style={{ width: "auto", minHeight: "auto", marginBottom: 0 }}
              checked={healthPrivate}
              onChange={(e) => setHealthPrivate(e.target.checked)}
            />
            <span className="sub" style={{ margin: 0 }}>Keep private from household</span>
          </div>
          <div className="chiplist" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 12px" }}>
            {healthList.map((h, i) => (
              <div key={i} className="chip sel">
                {h.name} {h.is_private ? "· private" : "· shared"}
                <X size={12} onClick={() => setHealthList((l) => l.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>

          <label>Accessibility</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: "auto", minHeight: "auto", marginBottom: 0 }}
              checked={colorblind}
              onChange={(e) => setColorblind(e.target.checked)}
            />
            <span className="sub" style={{ margin: 0 }}>Colorblind-safe mode (status always shown with icon + text too)</span>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setStep(2)}>back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={finish}>skip rest</button>
              <button className="btn-primary" onClick={finish}>continue</button>
            </div>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <p className="stepnote sub">step 4 of 4</p>
          <h1>
            <Sparkles size={18} style={{ display: "inline", verticalAlign: -3, marginRight: 4 }} /> All set, {currentProfile.name}
          </h1>
          <p className="sub">You can change any of this later from your profile.</p>
          <div className="card">
            <div className="item"><span style={{ color: "var(--ink2)" }}>Goal</span><span>{goal}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Allergies</span><span>{allergyList.join(", ") || "none"}</span></div>
            <div className="item"><span style={{ color: "var(--ink2)" }}>Avoidances</span><span>{avoidanceList.join(", ") || "none"}</span></div>
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={() => router.push("/")}>
            go to my kitchen →
          </button>
        </>
      )}
    </div>
  );
}

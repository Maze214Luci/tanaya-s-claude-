"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Zone } from "@/lib/types";

interface DraftItem {
  name: string;
  quantity: number;
  unit: string;
  zone: Zone;
  confidence: "high" | "low";
}

function parseLines(text: string): DraftItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0] || "Unknown item";
      const quantity = Number(parts[1]) || 1;
      const unit = parts[2] || "unit";
      // Anything we can't confidently parse a quantity for is routed to
      // manual review, per the PRD's low-confidence handling rule.
      const confidence: DraftItem["confidence"] = parts[1] && !Number.isNaN(Number(parts[1])) ? "high" : "low";
      return { name, quantity, unit, zone: "pantry" as Zone, confidence };
    });
}

export default function ScanPage() {
  const { addInventoryItem, toast } = useStore();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null);

  function detect() {
    setDrafts(parseLines(text));
  }

  function updateDraft(i: number, fields: Partial<DraftItem>) {
    setDrafts((d) => d && d.map((item, idx) => (idx === i ? { ...item, ...fields } : item)));
  }

  function removeDraft(i: number) {
    setDrafts((d) => d && d.filter((_, idx) => idx !== i));
  }

  function confirmSave() {
    if (!drafts) return;
    drafts.forEach((d) =>
      addInventoryItem({ name: d.name, quantity: d.quantity, unit: d.unit, zone: d.zone, expiry_estimate: null, freshness_status: "fresh" })
    );
    toast(`${drafts.length} item${drafts.length === 1 ? "" : "s"} added to inventory`);
    setDrafts(null);
    setText("");
  }

  return (
    <div>
      <Link href="/inventory" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
        <ArrowLeft size={13} /> back to inventory
      </Link>
      <h1>Add to inventory</h1>
      <p className="sub">
        Photo scanning of receipts/pantry shelves is on the roadmap and needs an OCR
        provider to be wired up server-side. For now, list what you bought below —
        anything without a clear quantity gets routed to manual review before saving.
      </p>

      {!drafts && (
        <div className="card">
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Camera size={14} /> Photo of items bought / grocery order screenshot
          </label>
          <input type="file" accept="image/*" disabled />
          <p className="sub" style={{ margin: "0 0 10px" }}>Photo upload is captured but not auto-parsed yet — use the list below instead.</p>
          <label>Items (one per line — name, quantity, unit)</label>
          <textarea
            rows={5}
            placeholder={"Tomatoes, 500, g\nMilk, 1, L\nOnions"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary" onClick={detect} disabled={!text.trim()}>
            detect items
          </button>
        </div>
      )}

      {drafts && (
        <>
          <p className="sub">Review before saving — low-confidence items are flagged.</p>
          {drafts.map((d, i) => (
            <div className="card" key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 100 }}>
                <label>Item {d.confidence === "low" && <span style={{ color: "var(--brick)" }}>· needs review</span>}</label>
                <input value={d.name} onChange={(e) => updateDraft(i, { name: e.target.value })} />
              </div>
              <div style={{ flex: 1, minWidth: 70 }}>
                <label>Qty</label>
                <input type="number" value={d.quantity} onChange={(e) => updateDraft(i, { quantity: Number(e.target.value) })} />
              </div>
              <div style={{ flex: 1, minWidth: 70 }}>
                <label>Unit</label>
                <input value={d.unit} onChange={(e) => updateDraft(i, { unit: e.target.value })} />
              </div>
              <div style={{ flex: 1, minWidth: 90 }}>
                <label>Zone</label>
                <select value={d.zone} onChange={(e) => updateDraft(i, { zone: e.target.value as Zone })}>
                  <option value="pantry">Pantry</option>
                  <option value="fridge">Fridge</option>
                  <option value="freezer">Freezer</option>
                </select>
              </div>
              <X size={16} color="var(--ink2)" style={{ cursor: "pointer", marginBottom: 10 }} onClick={() => removeDraft(i)} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDrafts(null)}>back</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={confirmSave} disabled={drafts.length === 0}>
              <Check size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} /> confirm &amp; save
            </button>
          </div>
        </>
      )}
    </div>
  );
}

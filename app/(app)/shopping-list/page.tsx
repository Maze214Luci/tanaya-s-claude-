"use client";

import { useState } from "react";
import { ShoppingCart, Check, Camera, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";

// Lightweight client-side grouping — no category field on the item, just a
// name-keyword heuristic so the order-ready view can group like the design
// brief describes (produce / dairy / staples / other) without a schema change.
const CATEGORY_KEYWORDS: { label: string; words: string[] }[] = [
  { label: "Produce", words: ["tomato", "onion", "potato", "pepper", "spinach", "coriander", "lemon", "garlic", "ginger", "chilli", "vegetable", "fruit", "banana", "apple"] },
  { label: "Dairy", words: ["milk", "curd", "paneer", "cheese", "butter", "ghee", "yoghurt", "yogurt", "cream"] },
  { label: "Staples", words: ["rice", "dal", "flour", "atta", "sugar", "salt", "oil", "wheat", "poha", "besan", "grain"] },
  { label: "Meat & eggs", words: ["chicken", "fish", "mutton", "egg", "prawn"] },
];

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const { label, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return label;
  }
  return "Other";
}

export default function ShoppingListPage() {
  const { state, addShoppingItem, togglePurchased, toast } = useStore();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [orderReady, setOrderReady] = useState(false);

  const pending = state.shoppingList.filter((i) => i.status === "pending");
  const purchased = state.shoppingList.filter((i) => i.status === "purchased");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addShoppingItem({ name: name.trim(), quantity_needed: qty || null, source: "manual_pick" });
    setName("");
    setQty("");
  }

  function markAllOrdered() {
    pending.forEach((i) => togglePurchased(i.id));
    toast("Marked as ordered — reconcile against the pantry once it arrives");
    setOrderReady(false);
  }

  if (orderReady) {
    const grouped = new Map<string, typeof pending>();
    for (const item of pending) {
      const cat = categorize(item.name);
      grouped.set(cat, [...(grouped.get(cat) ?? []), item]);
    }
    return (
      <div style={{ background: "var(--surf)", minHeight: "100vh", margin: "-2rem -1.25rem", padding: "2rem 1.25rem" }}>
        <button className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18 }} onClick={() => setOrderReady(false)}>
          <ArrowLeft size={13} /> back
        </button>
        <h1 style={{ fontSize: 30 }}>Order-ready list</h1>
        <p className="sub">Screenshot this, then order in Blinkit / Zepto / Instamart using it as reference.</p>
        {[...grouped.entries()].map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{cat}</div>
            {items.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed var(--bd)", fontSize: 18, fontFamily: "var(--font-read)" }}>
                <span>{i.name}</span>
                <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--sage-deep)" }}>{i.quantity_needed ?? ""}</span>
              </div>
            ))}
          </div>
        ))}
        {pending.length === 0 && <p className="sub">Nothing pending.</p>}
        <div className="card card-highlight" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
          <Camera size={20} color="var(--sage-deep)" />
          <p style={{ margin: 0, fontSize: 13 }}>Ready to screenshot — no API hand-off in v1, this is the whole mechanism.</p>
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={markAllOrdered} disabled={pending.length === 0}>
          mark as ordered
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1><ShoppingCart size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> Shopping list</h1>
      <p className="sub">from this week&apos;s plan, manual picks, and low-stock nudges</p>

      <form onSubmit={add} className="card" style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item" style={{ flex: 2, marginBottom: 0 }} />
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="qty" style={{ flex: 1, marginBottom: 0 }} />
        <button className="btn-primary" type="submit">add</button>
      </form>

      <div className="card">
        {pending.length === 0 && <p className="sub" style={{ margin: 0 }}>Nothing pending — nice.</p>}
        {pending.map((i) => (
          <div className="item" key={i.id}>
            <span>
              {i.name}{" "}
              <span style={{ fontSize: 10, color: "var(--ink2)", border: "0.5px solid var(--bd)", padding: "1px 7px", borderRadius: 20, marginLeft: 4 }}>
                {i.source === "weekly_plan" ? "weekly plan" : i.source === "low_stock_nudge" ? "low stock" : "manual"}
              </span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--ink2)", fontSize: 11 }}>{i.quantity_needed}</span>
              <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => togglePurchased(i.id)}>
                mark bought
              </button>
            </span>
          </div>
        ))}
      </div>

      {purchased.length > 0 && (
        <>
          <h2>Ordered / bought</h2>
          <div className="card">
            {purchased.map((i) => (
              <div className="item" key={i.id}>
                <span style={{ textDecoration: "line-through", color: "var(--ink2)" }}>
                  <Check size={12} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />
                  {i.name}
                </span>
                <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => togglePurchased(i.id)}>
                  undo
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={() => setOrderReady(true)} disabled={pending.length === 0}>
        <Camera size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} /> get order-ready list
      </button>
      <p className="sub" style={{ textAlign: "center", marginTop: 6 }}>
        Renders a clean, screenshot-friendly list — no direct integration with quick-commerce apps in v1.
      </p>
    </div>
  );
}

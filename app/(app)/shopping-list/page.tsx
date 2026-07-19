"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useStore } from "@/lib/demo/store";

export default function ShoppingListPage() {
  const { state, addShoppingItem, togglePurchased, toast } = useStore();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const pending = state.shoppingList.filter((i) => i.status === "pending");
  const purchased = state.shoppingList.filter((i) => i.status === "purchased");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addShoppingItem({ name: name.trim(), quantity_needed: qty || null, source: "manual_pick" });
    setName("");
    setQty("");
  }

  function sendToBlinkit() {
    toast(`Sent ${pending.length} item${pending.length === 1 ? "" : "s"} to Blinkit`);
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
          <h2>Purchased</h2>
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

      <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={sendToBlinkit} disabled={pending.length === 0}>
        <ShoppingCart size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} /> send to Blinkit
      </button>
      <p className="sub" style={{ textAlign: "center", marginTop: 6 }}>v1 hand-off is a plain export — deep-link integration is a future scope item.</p>
    </div>
  );
}

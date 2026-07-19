"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBasket, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FreshnessBadge } from "@/components/StatusIcon";
import type { Zone } from "@/lib/types";

const ZONES: { key: Zone; label: string }[] = [
  { key: "pantry", label: "Pantry" },
  { key: "fridge", label: "Fridge" },
  { key: "freezer", label: "Freezer" },
];

export default function InventoryPage() {
  const { state, addInventoryItem, removeInventoryItem, addShoppingItem, toast } = useStore();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("unit");
  const [zone, setZone] = useState<Zone>("pantry");

  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !qty) return;
    addInventoryItem({ name: name.trim(), quantity: Number(qty), unit, zone, expiry_estimate: null, freshness_status: "fresh" });
    toast(`Added ${name.trim()} to ${zone}`);
    setName("");
    setQty("");
  }

  function nudgeToShoppingList(itemName: string) {
    addShoppingItem({ name: itemName, quantity_needed: null, source: "low_stock_nudge" });
    toast(`${itemName} added to shopping list`);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1><ShoppingBasket size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> Inventory</h1>
        <Link href="/inventory/scan" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Plus size={14} /> add to inventory
        </Link>
      </div>

      <form onSubmit={quickAdd} className="card" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 120 }}>
          <label>Item</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tomatoes" />
        </div>
        <div style={{ flex: 1, minWidth: 70 }}>
          <label>Qty</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" />
        </div>
        <div style={{ flex: 1, minWidth: 80 }}>
          <label>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {["unit", "g", "kg", "ml", "L", "bunch"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label>Zone</label>
          <select value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
            {ZONES.map((z) => (
              <option key={z.key} value={z.key}>{z.label}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" style={{ marginBottom: 10 }} type="submit">quick add</button>
      </form>

      {ZONES.map((z) => {
        const items = state.inventory.filter((i) => i.zone === z.key);
        if (items.length === 0) return null;
        return (
          <div key={z.key}>
            <h2>{z.label}</h2>
            <div className="card stitch">
              {items.map((i) => (
                <div className="item" key={i.id}>
                  <span>
                    {i.name} <span style={{ color: "var(--ink2)", fontSize: 11 }}>{i.quantity}{i.unit}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FreshnessBadge
                      status={i.quantity <= 0 ? "expired" : i.freshness_status}
                      note={i.quantity <= 0 ? "out of stock" : i.freshness_status === "expiring_soon" && i.expiry_estimate ? `${i.expiry_estimate}` : undefined}
                    />
                    {(i.quantity <= 0 || i.freshness_status !== "fresh") && (
                      <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => nudgeToShoppingList(i.name)}>
                        add to list
                      </button>
                    )}
                    <Trash2 size={14} color="var(--ink2)" style={{ cursor: "pointer" }} onClick={() => removeInventoryItem(i.id)} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

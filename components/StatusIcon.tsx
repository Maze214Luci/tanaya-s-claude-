import { Check, AlertTriangle, Clock, ShoppingCart } from "lucide-react";
import type { FreshnessStatus } from "@/lib/types";
import type { IngredientStatus } from "@/lib/engine/inventory";

// Accessibility requirement (PRD sec 8/10): status is never color-only —
// every state pairs a distinct icon with a text label.

export function FreshnessBadge({ status, note }: { status: FreshnessStatus; note?: string }) {
  const map: Record<FreshnessStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    fresh: { icon: <Check size={13} />, label: note ?? "fresh", cls: "ok" },
    expiring_soon: { icon: <Clock size={13} />, label: note ?? "expiring soon", cls: "low" },
    expired: { icon: <AlertTriangle size={13} />, label: note ?? "expired", cls: "need" },
  };
  const m = map[status];
  return (
    <span className={`stat ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

export function IngredientBadge({ status }: { status: IngredientStatus }) {
  const map: Record<IngredientStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    ok: { icon: <Check size={13} />, label: "in stock", cls: "ok" },
    low: { icon: <AlertTriangle size={13} />, label: "low", cls: "low" },
    need: { icon: <ShoppingCart size={13} />, label: "need to buy", cls: "need" },
  };
  const m = map[status];
  return (
    <span className={`stat ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

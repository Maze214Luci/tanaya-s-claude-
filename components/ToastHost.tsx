"use client";

import { useStore } from "@/lib/store";

export function ToastHost() {
  const { toasts } = useStore();
  const msg = toasts[0];
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

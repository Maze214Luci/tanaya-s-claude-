"use client";

import React from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { DemoStoreProvider } from "@/lib/demo/store";
import { LiveStoreProvider } from "./live";
import { MOOD_CONFLICTS } from "@/lib/engine/constraints";

export { useStore } from "./context";
export type { Ctx, State } from "./context";
export const MOOD_CONFLICT_MAP = MOOD_CONFLICTS;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) {
    return <LiveStoreProvider>{children}</LiveStoreProvider>;
  }
  return <DemoStoreProvider>{children}</DemoStoreProvider>;
}

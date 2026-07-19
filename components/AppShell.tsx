"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Home as HomeIcon,
  ShoppingBasket,
  Calendar,
  ShoppingCart,
  History,
  Users,
  Sprout,
} from "lucide-react";
import { useStore } from "@/lib/demo/store";

const NAV = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/inventory", label: "Inventory", icon: ShoppingBasket },
  { href: "/plan/week", label: "Weekly plan", icon: Calendar },
  { href: "/shopping-list", label: "Shopping list", icon: ShoppingCart },
  { href: "/history", label: "History", icon: History },
  { href: "/household", label: "Household", icon: Users },
];

function navTarget(pathname: string) {
  if (pathname.startsWith("/today") || pathname.startsWith("/recipe") || pathname.startsWith("/meals")) return "/";
  return pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, currentProfile, switchProfile } = useStore();

  useEffect(() => {
    if (!state.home || !state.currentProfileId) {
      router.replace("/login");
    } else if (!state.onboarded) {
      router.replace("/onboarding/persona");
    }
  }, [state.home, state.currentProfileId, state.onboarded, router]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-colorblind",
      currentProfile?.accessibility.colorblind_safe ? "true" : "false"
    );
  }, [currentProfile?.accessibility.colorblind_safe]);

  if (!state.home || !state.currentProfileId || !state.onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="sub">Loading your kitchen…</p>
      </div>
    );
  }

  const active = navTarget(pathname);

  return (
    <div className="mx-auto flex min-h-screen max-w-[980px]">
      <aside className="hidden w-[196px] shrink-0 px-4 py-7 md:block">
        <div className="mb-7 flex items-center gap-2.5 pl-1">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--sage)" }}>
            <Sprout size={18} color="var(--surf)" />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink)", lineHeight: 1.2 }}>
            Kitchen
            <br />
            companion
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const sel = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[13px]"
                style={{
                  background: sel ? "var(--surf)" : "transparent",
                  color: sel ? "var(--ink)" : "var(--ink2)",
                  fontWeight: sel ? 500 : 400,
                  boxShadow: sel ? "var(--shadow)" : "none",
                }}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-5 pb-24 pt-8 md:px-8">
        {state.profiles.length > 1 && (
          <div className="mb-4 flex items-center justify-end gap-2 text-[11px]" style={{ color: "var(--ink2)" }}>
            viewing as
            <select
              value={currentProfile?.id}
              onChange={(e) => switchProfile(e.target.value)}
              style={{ width: "auto", minHeight: 28, padding: "2px 8px", marginBottom: 0, fontSize: 11 }}
            >
              {state.profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex items-start justify-around border-t px-1.5 pb-5 pt-2 md:hidden"
        style={{ background: "var(--surf)", borderColor: "var(--bd)" }}
      >
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const sel = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 rounded-[10px] py-1 text-[10px] font-medium"
              style={{ color: sel ? "var(--sage)" : "var(--ink2)" }}
            >
              <Icon size={20} />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

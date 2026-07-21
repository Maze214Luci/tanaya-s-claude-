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
  LogOut,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { nextRouteFor } from "@/lib/store/routing";
import { Watercolor } from "@/components/Watercolor";

const NAV = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/inventory", label: "Inventory", icon: ShoppingBasket },
  { href: "/plan/week", label: "Weekly plan", icon: Calendar },
  { href: "/shopping-list", label: "Shopping list", icon: ShoppingCart },
  { href: "/history", label: "History", icon: History },
  { href: "/household", label: "Household", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function navTarget(pathname: string) {
  if (pathname.startsWith("/recipe") || pathname.startsWith("/meals")) return "/";
  return pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, mode, currentProfile, switchProfile, signOut } = useStore();

  const redirectTarget = nextRouteFor(state);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-colorblind",
      currentProfile?.accessibility.colorblind_safe ? "true" : "false"
    );
  }, [currentProfile?.accessibility.colorblind_safe]);

  if (redirectTarget) {
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
          <div className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center overflow-hidden">
            <Watercolor color="var(--sage)" size={54} variant={1} style={{ top: -9, left: -9 }} />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 18, color: "var(--ink)", lineHeight: 1.1 }}>
            Larder
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
        <button
          className="btn-ghost mt-4 flex w-full items-center justify-center gap-2"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
        >
          <LogOut size={13} /> sign out
        </button>
      </aside>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-5 pb-24 pt-8 md:px-8">
        <div className="mb-4 flex items-center justify-between gap-2 text-[11px]" style={{ color: "var(--ink2)" }}>
          <Link href="/profile" className="flex items-center gap-1" style={{ color: "var(--ink2)" }}>
            <UserRound size={13} /> {currentProfile?.name}&apos;s profile
          </Link>
          {mode === "demo" && state.profiles.length > 1 && (
            <div className="flex items-center gap-2">
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
        </div>
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
              style={{ color: sel ? "var(--sage-deep)" : "var(--ink2)" }}
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

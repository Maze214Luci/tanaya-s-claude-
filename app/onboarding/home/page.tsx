"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HousePlus, DoorOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { nextRouteFor } from "@/lib/store/routing";

export default function CreateOrJoinPage() {
  const router = useRouter();
  const { state, mode, createHome, signInDemo } = useStore();
  const [uiMode, setUiMode] = useState<"none" | "create" | "join">("none");
  const [homeName, setHomeName] = useState("");
  const [personName, setPersonName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    // Demo mode has no separate signup step — "create a home" is itself
    // the identity bootstrap, so it's reachable with no prior auth. Live
    // mode always requires a real session first.
    if (mode === "live" && !state.currentProfileId) {
      router.replace("/login");
      return;
    }
    if (state.currentProfileId) {
      const next = nextRouteFor(state);
      if (next && next !== "/onboarding/home") router.replace(next);
    }
  }, [state, mode, router]);

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!homeName.trim() || !personName.trim()) return;
    createHome(homeName.trim(), personName.trim());
    router.push("/onboarding/persona");
  }

  function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    // Demo only — real accounts auto-join via a matching invite at signup.
    signInDemo();
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-[420px] px-6 py-10">
      <h1>Let&apos;s get your kitchen set up</h1>
      <p className="sub">Start a new home, or join one you&apos;ve been invited to</p>

      <div className="card cursor-pointer" onClick={() => setUiMode("create")}>
        <HousePlus size={20} color="var(--sage)" />
        <h2 style={{ marginTop: 8 }}>Create a home</h2>
        <p className="sub" style={{ margin: 0 }}>You&apos;ll be the first admin — invite others after</p>
      </div>

      {uiMode === "create" && (
        <form onSubmit={submitCreate} className="card">
          <label>Your name</label>
          <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Tanaya" />
          <label>Home name</label>
          <input value={homeName} onChange={(e) => setHomeName(e.target.value)} placeholder="Tanaya & Ankit's kitchen" />
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>
            create home
          </button>
        </form>
      )}

      {mode === "demo" ? (
        <>
          <div className="card cursor-pointer" onClick={() => setUiMode("join")}>
            <DoorOpen size={20} color="var(--sage)" />
            <h2 style={{ marginTop: 8 }}>Join a home</h2>
            <p className="sub" style={{ margin: 0 }}>Enter an invite code from your admin</p>
          </div>

          {uiMode === "join" && (
            <form onSubmit={submitJoin} className="card">
              <label>Invite code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. KTCHN-4F2A" />
              <p className="sub" style={{ margin: "0 0 10px" }}>
                You&apos;ll be a pending member until an admin approves you and assigns a role.
              </p>
              <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                request to join
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="card">
          <DoorOpen size={20} color="var(--sage)" />
          <h2 style={{ marginTop: 8 }}>Joining an existing home?</h2>
          <p className="sub" style={{ margin: 0 }}>
            Ask your household admin to invite this account&apos;s email from their Household page — you&apos;ll be
            added automatically the next time you sign in, with the role they picked.
          </p>
        </div>
      )}
    </div>
  );
}

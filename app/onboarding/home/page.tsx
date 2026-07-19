"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HousePlus, DoorOpen } from "lucide-react";
import { useStore } from "@/lib/demo/store";

export default function CreateOrJoinPage() {
  const router = useRouter();
  const { createHome, signInDemo } = useStore();
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [homeName, setHomeName] = useState("");
  const [personName, setPersonName] = useState("");
  const [code, setCode] = useState("");

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!homeName.trim() || !personName.trim()) return;
    createHome(homeName.trim(), personName.trim());
    router.push("/onboarding/persona");
  }

  function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    // Demo: any invite code drops you into the seeded household as if
    // an admin had already approved you.
    signInDemo();
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-[420px] px-6 py-10">
      <h1>Let&apos;s get your kitchen set up</h1>
      <p className="sub">Start a new home, or join one you&apos;ve been invited to</p>

      <div className="card cursor-pointer" onClick={() => setMode("create")}>
        <HousePlus size={20} color="var(--sage)" />
        <h2 style={{ marginTop: 8 }}>Create a home</h2>
        <p className="sub" style={{ margin: 0 }}>You&apos;ll be the first admin — invite others after</p>
      </div>

      {mode === "create" && (
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

      <div className="card cursor-pointer" onClick={() => setMode("join")}>
        <DoorOpen size={20} color="var(--sage)" />
        <h2 style={{ marginTop: 8 }}>Join a home</h2>
        <p className="sub" style={{ margin: 0 }}>Enter an invite code from your admin</p>
      </div>

      {mode === "join" && (
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
    </div>
  );
}

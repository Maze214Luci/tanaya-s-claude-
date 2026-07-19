"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/demo/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { state, signInDemo } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.home && state.currentProfileId) {
      router.replace(state.onboarded ? "/" : "/onboarding/persona");
    }
  }, [state.home, state.currentProfileId, state.onboarded, router]);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    signInDemo();
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--sage)", textAlign: "center", margin: "0 0 20px" }}>
        kitchen companion
      </p>
      <h1 style={{ textAlign: "center" }}>Welcome back</h1>
      <p className="sub" style={{ textAlign: "center" }}>Sign in to see today&apos;s meals</p>

      {!isSupabaseConfigured && (
        <div className="card" style={{ fontSize: 12, color: "var(--ink2)" }}>
          Running in demo mode — no Supabase project connected. Sign-in loads a
          seeded household (Tanaya &amp; Ankit) from local storage. See{" "}
          <code>.env.example</code> to connect a real Supabase backend.
        </div>
      )}

      <form onSubmit={handleSignIn}>
        <label>Phone or email</label>
        <input type="text" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }}>
          sign in
        </button>
      </form>

      <div className="divider-trail">or</div>

      <button
        className="btn-ghost"
        style={{ width: "100%" }}
        onClick={() => router.push("/onboarding/home")}
      >
        create or join a home instead
      </button>
    </div>
  );
}

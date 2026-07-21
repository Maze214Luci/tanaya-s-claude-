"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { nextRouteFor } from "@/lib/store/routing";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Watercolor } from "@/components/Watercolor";

export default function LoginPage() {
  const router = useRouter();
  const { state, signInDemo, authSignIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next = nextRouteFor(state);
    if (next && next !== "/login") router.replace(next);
  }, [state, router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      signInDemo();
      router.push("/");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await authSignIn(email, password);
    setSubmitting(false);
    if (signInError) setError(signInError);
    // success routes automatically via the effect above once the session lands
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
      <div className="relative mx-auto mb-1 h-16 w-24 overflow-hidden" aria-hidden>
        <Watercolor color="var(--sage)" size={90} variant={0} style={{ top: -14, left: 6 }} />
        <Watercolor color="var(--amber-soft)" size={64} variant={2} style={{ top: 4, left: 40, opacity: 0.4 }} />
      </div>
      <h1 style={{ textAlign: "center", fontSize: 40 }}>Kitchen Kanvas</h1>
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 16, color: "var(--sage-deep)", textAlign: "center", margin: "0 0 22px" }}>
        a quiet, well-kept kitchen
      </p>
      <h2 style={{ textAlign: "center", justifyContent: "center", fontSize: 18 }}>Welcome back</h2>
      <p className="sub" style={{ textAlign: "center" }}>Sign in to see today&apos;s meals</p>

      {!isSupabaseConfigured && (
        <div className="card" style={{ fontSize: 12, color: "var(--ink2)" }}>
          Running in demo mode — no Supabase project connected. Sign-in loads a
          seeded household (Tanaya &amp; Ankit) from local storage. See{" "}
          <code>.env.example</code> to connect a real Supabase backend.
        </div>
      )}

      <form onSubmit={handleSignIn}>
        <label>Email</label>
        <input type="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required={isSupabaseConfigured} />
        <label>Password</label>
        <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required={isSupabaseConfigured} />
        {error && <p style={{ color: "var(--brick)", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}
        <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
          {submitting ? "signing in…" : "sign in"}
        </button>
      </form>

      <div className="divider-trail">or</div>

      {isSupabaseConfigured ? (
        <Link href="/signup" className="btn-ghost" style={{ width: "100%", textAlign: "center", display: "block" }}>
          create an account
        </Link>
      ) : (
        <button className="btn-ghost" style={{ width: "100%" }} onClick={() => router.push("/onboarding/home")}>
          create or join a home instead
        </button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { nextRouteFor } from "@/lib/store/routing";

export default function SignupPage() {
  const router = useRouter();
  const { state, authSignUp } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => {
    const next = nextRouteFor(state);
    if (next && next !== "/login") router.replace(next);
  }, [state, router]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signUpError, needsConfirmation } = await authSignUp(email, password, name);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    if (needsConfirmation) {
      setConfirmSent(true);
      return;
    }
    // no confirmation required — session is live, the effect above routes onward
  }

  if (confirmSent) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6 text-center">
        <h1>Check your email</h1>
        <p className="sub">
          We sent a confirmation link to <b>{email}</b>. Click it, then come back and sign in.
        </p>
        <Link href="/login" className="btn-primary" style={{ display: "block", textAlign: "center" }}>
          back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--sage)", textAlign: "center", margin: "0 0 20px" }}>
        kitchen companion
      </p>
      <h1 style={{ textAlign: "center" }}>Create your account</h1>
      <p className="sub" style={{ textAlign: "center" }}>
        If your household admin already invited this email, you&apos;ll be added to their home automatically.
      </p>

      <form onSubmit={handleSignUp}>
        <label>Your name</label>
        <input type="text" placeholder="Tanaya" value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Email</label>
        <input type="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        {error && <p style={{ color: "var(--brick)", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}
        <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
          {submitting ? "creating account…" : "create account"}
        </button>
      </form>

      <div className="divider-trail">or</div>
      <Link href="/login" className="btn-ghost" style={{ width: "100%", textAlign: "center", display: "block" }}>
        already have an account? sign in
      </Link>
    </div>
  );
}

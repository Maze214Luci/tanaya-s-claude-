"use client";

import { useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/demo/store";
import type { Role } from "@/lib/types";

export default function HouseholdPage() {
  const { state, isAdmin, createInvite, approveInvite, declineInvite } = useStore();
  const [contact, setContact] = useState("");

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    createInvite(contact.trim());
    setContact("");
  }

  const pendingInvites = state.invites.filter((i) => i.status === "pending");

  return (
    <div>
      <h1><Users size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> {state.home?.name}</h1>
      <p className="sub">Members and role assignment. {state.home && `${state.profiles.length} member${state.profiles.length === 1 ? "" : "s"}.`}</p>

      <h2>Members</h2>
      <div className="card">
        {state.profiles.map((p) => (
          <div className="item" key={p.id}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {p.role === "admin" && <ShieldCheck size={13} color="var(--sage)" />}
              {p.name}
            </span>
            <span className="tag" style={{ margin: 0 }}>{p.role}</span>
          </div>
        ))}
      </div>

      {isAdmin && (
        <>
          <h2>Invite a member</h2>
          <form onSubmit={invite} className="card" style={{ display: "flex", gap: 8 }}>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" style={{ flex: 1, marginBottom: 0 }} />
            <button className="btn-primary" type="submit">send invite</button>
          </form>
          <p className="sub">Role (Admin or Member) is assigned at approval, not at invite time.</p>

          {pendingInvites.length > 0 && (
            <>
              <h2>Pending approval</h2>
              <div className="card">
                {pendingInvites.map((i) => (
                  <div className="item" key={i.id} style={{ flexWrap: "wrap" }}>
                    <span>{i.invitee_contact}</span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => approveInvite(i.id, "member")}>
                        approve as member
                      </button>
                      <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => approveInvite(i.id, "admin" as Role)}>
                        approve as admin
                      </button>
                      <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => declineInvite(i.id)}>
                        decline
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export default function HouseholdPage() {
  const { state, mode, isAdmin, currentProfile, createInvite, approveInvite, declineInvite, setMemberRole } = useStore();
  const [contact, setContact] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const adminCount = state.profiles.filter((p) => p.role === "admin").length;

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    createInvite(contact.trim(), inviteRole);
    setContact("");
  }

  function toggleRole(profileId: string, current: Role) {
    setMemberRole(profileId, current === "admin" ? "member" : "admin");
  }

  const pendingInvites = state.invites.filter((i) => i.status === "pending");

  return (
    <div>
      <h1><Users size={20} color="var(--sage)" style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} /> {state.home?.name}</h1>
      <p className="sub">Members and role assignment. {state.home && `${state.profiles.length} member${state.profiles.length === 1 ? "" : "s"}.`}</p>

      <h2>Members</h2>
      <div className="card">
        {state.profiles.map((p) => {
          const isLastAdmin = p.role === "admin" && adminCount <= 1;
          return (
            <div className="item" key={p.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {p.role === "admin" && <ShieldCheck size={13} color="var(--sage)" />}
                {p.name}
                {p.id === currentProfile?.id && <span className="sub" style={{ margin: 0 }}>(you)</span>}
              </span>
              {isAdmin ? (
                <button
                  className="btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  disabled={isLastAdmin}
                  title={isLastAdmin ? "A home needs at least one admin" : undefined}
                  onClick={() => toggleRole(p.id, p.role)}
                >
                  {p.role} · {p.role === "admin" ? "demote to member" : "promote to admin"}
                </button>
              ) : (
                <span className="tag" style={{ margin: 0 }}>{p.role}</span>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <>
          <h2>Invite a member</h2>
          <form onSubmit={invite} className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email" style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} style={{ width: "auto", marginBottom: 0 }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn-primary" type="submit">send invite</button>
          </form>
          {mode === "live" ? (
            <p className="sub">
              They&apos;ll join automatically, with the role above, the next time they sign in with this email —
              no invite code needed.
            </p>
          ) : (
            <p className="sub">Role is confirmed at approval below.</p>
          )}

          {pendingInvites.length > 0 && (
            <>
              <h2>Pending</h2>
              <div className="card">
                {pendingInvites.map((i) => (
                  <div className="item" key={i.id} style={{ flexWrap: "wrap" }}>
                    <span>{i.invitee_contact} <span className="tag" style={{ margin: "0 0 0 4px" }}>{i.proposed_role}</span></span>
                    {mode === "demo" ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => approveInvite(i.id, "member")}>
                          approve as member
                        </button>
                        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => approveInvite(i.id, "admin")}>
                          approve as admin
                        </button>
                        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => declineInvite(i.id)}>
                          decline
                        </button>
                      </span>
                    ) : (
                      <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => declineInvite(i.id)}>
                        cancel invite
                      </button>
                    )}
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

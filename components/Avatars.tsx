import type { Profile } from "@/lib/types";

export function Avatars({ profiles }: { profiles: Profile[] }) {
  return (
    <div style={{ display: "flex", marginBottom: 6 }}>
      {profiles.map((p, i) => (
        <div
          key={p.id}
          title={p.name}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: i % 2 === 0 ? "var(--sage)" : "var(--brick)",
            color: "var(--surf)",
            fontSize: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 500,
            marginRight: -6,
            border: "1.5px solid var(--surf)",
          }}
        >
          {p.name[0]}
        </div>
      ))}
    </div>
  );
}

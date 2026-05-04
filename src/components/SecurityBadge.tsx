/**
 * Secure-Drop — Security Badge
 * Always-visible encryption status pill with hoverable cipher chain detail.
 */
import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Lock, ChevronDown } from "lucide-react";

type BadgeVariant = "secured" | "verifying" | "failed" | "idle" | "transferring";

interface Props {
  variant?: BadgeVariant;
  hash?: string;
  compact?: boolean;
}

const CIPHER_CHAIN = [
  { label: "ECDH P-256", detail: "Ephemeral key pair — never stored" },
  { label: "HKDF-SHA-256", detail: "Key derivation with session binding" },
  { label: "AES-256-GCM", detail: "96-bit IV · 128-bit AEAD tag" },
  { label: "SHA-256", detail: "Post-transfer integrity verification" },
];

export const SecurityBadge: React.FC<Props> = ({
  variant = "idle",
  hash,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const configs: Record<BadgeVariant, { icon: React.ReactNode; label: string; className: string }> = {
    secured: {
      icon: <ShieldCheck size={compact ? 11 : 13} />,
      label: "AES-256-GCM · E2E",
      className: "sd-badge sd-badge-green",
    },
    verifying: {
      icon: <Lock size={compact ? 11 : 13} style={{ animation: "sd-rotate 1s linear infinite" }} />,
      label: "Verifying SHA-256…",
      className: "sd-badge sd-badge-amber",
    },
    failed: {
      icon: <ShieldAlert size={compact ? 11 : 13} />,
      label: "Integrity Failed",
      className: "sd-badge sd-badge-red",
    },
    idle: {
      icon: <Lock size={compact ? 11 : 13} />,
      label: "AES-256-GCM · E2E",
      className: "sd-badge sd-badge-teal",
    },
    transferring: {
      icon: <Lock size={compact ? 11 : 13} style={{ animation: "sd-rotate 2s linear infinite" }} />,
      label: "ENC · Transferring",
      className: "sd-badge sd-badge-violet",
    },
  };

  const cfg = configs[variant];

  if (compact) {
    return <span className={cfg.className}>{cfg.icon}{cfg.label}</span>;
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span className={cfg.className}>
          {cfg.icon}
          {cfg.label}
          <ChevronDown size={10} style={{ marginLeft: 2, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </span>
      </button>

      {hash && !expanded && (
        <div style={{ marginTop: 3, fontSize: 10, fontFamily: "monospace", color: "rgba(var(--sd-accent),0.6)", paddingLeft: 2 }}>
          SHA-256: {hash.slice(0, 8)}…{hash.slice(-8)}
        </div>
      )}

      {expanded && (
        <div
          className="sd-glass sd-animate-scale-in"
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 60,
            minWidth: 240, padding: "12px 14px", borderRadius: 12,
            border: "1px solid rgba(var(--sd-accent),0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgb(var(--sd-accent))", marginBottom: 8 }}>
            Cipher Chain
          </div>
          {CIPHER_CHAIN.map(({ label, detail }, i) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < CIPHER_CHAIN.length - 1 ? 8 : 0 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgb(var(--sd-accent))", marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--sd-text))" }}>{label}</div>
                <div style={{ fontSize: 10, color: "rgb(var(--sd-text-muted))" }}>{detail}</div>
              </div>
            </div>
          ))}
          {hash && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(var(--sd-border),0.5)", fontSize: 10, fontFamily: "monospace", color: "rgba(var(--sd-accent),0.7)", wordBreak: "break-all" }}>
              SHA-256: {hash}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

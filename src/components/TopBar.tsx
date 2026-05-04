import React, { useState, useRef, useEffect } from "react";
import { Shield, Sun, Moon, Wifi, WifiOff, Users, Pencil, Check, QrCode } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { SecureDropState } from "@/types/transfer";

interface TopBarProps {
  state: SecureDropState;
  onUpdateLabel: (label: string) => void;
  onQRClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ state, onUpdateLabel, onQRClick }) => {
  const { toggle, isDark } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.localLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) onUpdateLabel(trimmed);
    else setDraft(state.localLabel);
    setEditing(false);
  };

  const statusColor =
    state.signalingStatus === "connected" ? "rgb(74,222,128)"
    : state.signalingStatus === "connecting" ? "rgb(250,176,5)"
    : "rgb(248,113,113)";

  const StatusIcon = state.signalingStatus === "connected" ? Wifi : WifiOff;

  return (
    <header
      className="sd-glass"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        borderBottom: "1px solid rgba(var(--sd-accent),0.12)",
        padding: "0 24px",
        height: 60,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,rgb(0,212,170),rgb(130,100,255))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Shield size={16} color="white" strokeWidth={2.5} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: "rgb(var(--sd-text))", letterSpacing: "-0.02em" }}>
          Secure<span style={{ color: "rgb(var(--sd-accent))" }}>Drop</span>
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Peer count */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "rgb(var(--sd-text-muted))",
          background: "rgba(var(--sd-accent),0.07)",
          border: "1px solid rgba(var(--sd-accent),0.15)",
          borderRadius: 100, padding: "3px 10px",
        }}
      >
        <Users size={12} />
        <span>{state.peers.length} peer{state.peers.length !== 1 ? "s" : ""} online</span>
      </div>

      {/* Editable display name */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setDraft(state.localLabel); setEditing(false); } }}
              onBlur={commitEdit}
              maxLength={32}
              style={{
                background: "rgba(var(--sd-bg-raised),0.8)",
                border: "1px solid rgba(var(--sd-accent),0.4)",
                borderRadius: 6, padding: "4px 8px",
                fontSize: 13, fontWeight: 600,
                color: "rgb(var(--sd-text))", outline: "none", width: 140,
              }}
            />
            <button onClick={commitEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "rgb(var(--sd-accent))", padding: 2 }}>
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(state.localLabel); setEditing(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(var(--sd-bg-raised),0.6)",
              border: "1px solid rgba(var(--sd-border),1)",
              borderRadius: 8, padding: "4px 10px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "rgb(var(--sd-text))",
              transition: "all 0.15s ease",
            }}
          >
            {state.localLabel}
            <Pencil size={11} style={{ color: "rgb(var(--sd-text-faint))" }} />
          </button>
        )}
      </div>

      {/* Signaling status */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "rgb(var(--sd-text-muted))",
        }}
      >
        <div style={{ position: "relative", width: 8, height: 8 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: statusColor, opacity: 0.4 }} className="sd-ping" />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: statusColor }} />
        </div>
        <StatusIcon size={13} style={{ color: statusColor }} />
        <span style={{ textTransform: "capitalize" }}>{state.signalingStatus}</span>
      </div>

      {/* QR button */}
      <button
        onClick={onQRClick}
        title="Scan to join from another device"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(var(--sd-accent),0.08)",
          border: "1px solid rgba(var(--sd-accent),0.2)",
          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
          fontSize: 12, fontWeight: 500, color: "rgb(var(--sd-accent))",
          transition: "all 0.15s ease",
        }}
      >
        <QrCode size={14} />
        <span className="hidden sm:inline">Join</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        style={{
          width: 36, height: 36, borderRadius: 8, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(var(--sd-bg-raised),0.8)",
          border: "1px solid rgba(var(--sd-border),1)",
          color: "rgb(var(--sd-text-muted))",
          transition: "all 0.2s ease",
        }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
};

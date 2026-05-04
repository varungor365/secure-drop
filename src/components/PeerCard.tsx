/**
 * Secure-Drop — Peer Card
 * Displays a discovered peer on the local network.
 * Click to initiate a file transfer to that peer.
 */
import React from "react";
import { Wifi, Monitor, Smartphone, Globe, Send } from "lucide-react";
import type { Peer } from "@/types/transfer";

interface Props {
  peer: Peer;
  onSelect: (peer: Peer) => void;
  isActive?: boolean;
}

function getDeviceIcon(hint: string) {
  if (hint.toLowerCase().includes("android") || hint.toLowerCase().includes("ios")) {
    return <Smartphone size={18} style={{ color: "rgb(0, 212, 170)" }} />;
  }
  if (hint.toLowerCase().includes("macos") || hint.toLowerCase().includes("windows") || hint.toLowerCase().includes("linux")) {
    return <Monitor size={18} style={{ color: "rgb(0, 212, 170)" }} />;
  }
  return <Globe size={18} style={{ color: "rgb(0, 212, 170)" }} />;
}

function timeSince(epochMs: number): string {
  const secs = Math.floor((Date.now() - epochMs) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export const PeerCard: React.FC<Props> = ({ peer, onSelect, isActive = false }) => {
  return (
    <button
      onClick={() => onSelect(peer)}
      className="sd-glass sd-glass-hover w-full text-left p-4 flex items-center gap-4 group sd-animate-slide-up"
      style={{
        borderColor: isActive ? "rgba(0,212,170,0.5)" : undefined,
        boxShadow: isActive ? "0 0 20px rgba(0,212,170,0.1)" : undefined,
      }}
      aria-label={`Send file to ${peer.label}`}
    >
      {/* Device icon with pulse ring for connected peers */}
      <div
        className="relative flex items-center justify-center rounded-xl flex-shrink-0"
        style={{
          width: 48,
          height: 48,
          background: "rgba(0, 212, 170, 0.08)",
          border: "1px solid rgba(0, 212, 170, 0.2)",
        }}
      >
        {getDeviceIcon(peer.deviceHint)}
        {/* Online pulse dot */}
        <span
          className="absolute -top-1 -right-1 flex h-3 w-3"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: "rgb(74, 222, 128)" }} />
          <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: "rgb(74, 222, 128)" }} />
        </span>
      </div>

      {/* Peer info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="font-semibold truncate"
            style={{ color: "rgb(220, 230, 240)", fontSize: 15 }}
          >
            {peer.label}
          </span>
          {peer.connected && (
            <span className="sd-badge sd-badge-green" style={{ fontSize: 9 }}>
              <Wifi size={9} /> LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className="truncate"
            style={{ color: "rgb(130, 150, 175)", fontSize: 12 }}
          >
            {peer.deviceHint}
          </span>
          <span style={{ color: "rgba(130,150,175,0.4)", fontSize: 11 }}>·</span>
          <span
            className="sd-mono"
            style={{ color: "rgba(130,150,175,0.6)", fontSize: 10 }}
          >
            {peer.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Send action */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
        style={{
          width: 36,
          height: 36,
          background: "rgba(0,212,170,0.12)",
          border: "1px solid rgba(0,212,170,0.25)",
        }}
      >
        <Send size={15} style={{ color: "rgb(0, 212, 170)" }} />
      </div>
    </button>
  );
};

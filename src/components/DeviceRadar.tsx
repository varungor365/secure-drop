import React, { useCallback, useRef } from "react";
import { Laptop, Smartphone, Monitor, Tablet } from "lucide-react";
import type { Peer } from "@/types/transfer";

interface DeviceRadarProps {
  localLabel: string;
  localPeerId: string | null;
  peers: Peer[];
  selectedPeer: Peer | null;
  onPeerSelect: (peer: Peer) => void;
  onFileDrop: (peer: Peer, file: File) => void;
}

function getInitials(label: string) {
  return label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getDeviceIcon(hint: string) {
  if (/android|iphone|mobile/i.test(hint)) return Smartphone;
  if (/ipad|tablet/i.test(hint)) return Tablet;
  if (/tv|display/i.test(hint)) return Monitor;
  return Laptop;
}

function avatarColor(id: string) {
  const colors = [
    ["#00D4AA", "#8264FF"],
    ["#FF6B6B", "#FF8E53"],
    ["#4ECDC4", "#44A0DE"],
    ["#A78BFA", "#EC4899"],
    ["#F59E0B", "#EF4444"],
    ["#10B981", "#3B82F6"],
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function PeerOrbit({
  peer, index, total, selected, onSelect, onFileDrop,
}: {
  peer: Peer; index: number; total: number; selected: boolean;
  onSelect: (p: Peer) => void; onFileDrop: (p: Peer, f: File) => void;
}) {
  const angle = (index / total) * 360;
  const radius = total <= 3 ? 130 : total <= 5 ? 145 : 155;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  const [c1, c2] = avatarColor(peer.id);
  const DevIcon = getDeviceIcon(peer.deviceHint);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(peer, file);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
        zIndex: 10,
      }}
    >
      <div
        onClick={() => onSelect(peer)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: 68, height: 68, borderRadius: "50%", cursor: "pointer",
          background: `linear-gradient(135deg,${c1},${c2})`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: selected
            ? `0 0 0 3px white, 0 0 0 5px ${c1}, 0 0 24px ${c1}88`
            : `0 4px 16px rgba(0,0,0,0.3)`,
          transition: "all 0.25s ease",
          transform: selected ? "scale(1.12)" : "scale(1)",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1 }}>
          {getInitials(peer.label)}
        </span>
        <DevIcon size={12} color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }} />

        {/* Connected dot */}
        {peer.connected && (
          <div style={{
            position: "absolute", bottom: 3, right: 3,
            width: 10, height: 10, borderRadius: "50%",
            background: "rgb(74,222,128)", border: "2px solid rgba(0,0,0,0.4)",
          }} />
        )}
      </div>

      {/* Label */}
      <div style={{
        marginTop: 6, textAlign: "center",
        fontSize: 11, fontWeight: 600,
        color: "rgb(var(--sd-text))",
        whiteSpace: "nowrap",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {peer.label}
      </div>
    </div>
  );
}

export const DeviceRadar: React.FC<DeviceRadarProps> = ({
  localLabel, localPeerId, peers, selectedPeer, onPeerSelect, onFileDrop,
}) => {
  const radarRef = useRef<HTMLDivElement>(null);

  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const [c1] = avatarColor(localPeerId ?? "local");

  const showList = peers.length > 6;

  if (showList) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {peers.map((peer) => {
          const [pc1, pc2] = avatarColor(peer.id);
          const DevIcon = getDeviceIcon(peer.deviceHint);
          return (
            <div
              key={peer.id}
              onClick={() => onPeerSelect(peer)}
              className="sd-glass sd-glass-hover"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12, cursor: "pointer",
                border: selectedPeer?.id === peer.id ? `1px solid ${pc1}` : undefined,
                boxShadow: selectedPeer?.id === peer.id ? `0 0 12px ${pc1}44` : undefined,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg,${pc1},${pc2})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                  {getInitials(peer.label)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "rgb(var(--sd-text))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {peer.label}
                </div>
                <div style={{ fontSize: 11, color: "rgb(var(--sd-text-muted))" }}>
                  <DevIcon size={10} style={{ display: "inline", marginRight: 4 }} />
                  {peer.deviceHint}
                </div>
              </div>
              {peer.connected && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgb(74,222,128)" }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={radarRef}
      onDragOver={handleRootDragOver}
      style={{
        position: "relative",
        width: 380, height: 380,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* Radar rings */}
      {[156, 120, 84].map((r, i) => (
        <div
          key={r}
          className={`sd-radar-ring-${i + 1}`}
          style={{
            position: "absolute",
            width: r * 2, height: r * 2,
            borderRadius: "50%",
            border: `1px solid rgba(var(--sd-accent),${0.18 - i * 0.04})`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Rotating sweep line */}
      <div
        className="sd-spin"
        style={{
          position: "absolute", width: 312, height: 312, borderRadius: "50%",
          background: "conic-gradient(from 0deg, rgba(0,212,170,0.06) 0%, transparent 40%)",
          pointerEvents: "none",
        }}
      />

      {/* Local avatar at center */}
      <div
        className="sd-float"
        style={{
          width: 76, height: 76, borderRadius: "50%", zIndex: 10,
          background: `linear-gradient(135deg,${c1},rgb(130,100,255))`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 0 4px rgba(var(--sd-bg-void),1), 0 0 24px ${c1}66`,
          border: "2px solid rgba(var(--sd-accent),0.5)",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: "white", lineHeight: 1 }}>
          {getInitials(localLabel)}
        </span>
        <Laptop size={12} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
        <div style={{
          position: "absolute", bottom: 4, right: 4,
          width: 12, height: 12, borderRadius: "50%",
          background: "rgb(74,222,128)", border: "2px solid rgba(0,0,0,0.4)",
        }} />
      </div>

      {/* Peer avatars orbiting */}
      {peers.map((peer, i) => (
        <PeerOrbit
          key={peer.id}
          peer={peer}
          index={i}
          total={peers.length}
          selected={selectedPeer?.id === peer.id}
          onSelect={onPeerSelect}
          onFileDrop={onFileDrop}
        />
      ))}

      {/* Empty state hint */}
      {peers.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, calc(-50% + 60px))",
          textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 12, color: "rgb(var(--sd-text-faint))", lineHeight: 1.5 }}>
            Scanning for peers…
          </div>
        </div>
      )}

      {/* Hint when peer selected */}
      {selectedPeer && (
        <div style={{
          position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)",
          fontSize: 11, color: "rgb(var(--sd-accent))", whiteSpace: "nowrap",
          fontWeight: 500,
        }}>
          Drop a file onto {selectedPeer.label} or use the zone below
        </div>
      )}
    </div>
  );
};

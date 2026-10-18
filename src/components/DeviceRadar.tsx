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

  return (
    <div
      ref={radarRef}
      onDragOver={handleRootDragOver}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 360,
      }}
    >
      {/* Radar rings */}
      {[1, 0.66, 0.33].map((scale, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 340 * scale,
            height: 340 * scale,
            borderRadius: "50%",
            border: `1px solid rgba(130,150,175,${0.08 + i * 0.04})`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Sweep line */}
      <div
        style={{
          position: "absolute",
          width: 170,
          height: 2,
          transformOrigin: "left center",
          background: `linear-gradient(to right, transparent, ${c1}66)`,
          animation: "radar-sweep 3s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Local node */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${c1}, #8264FF)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 0 3px rgba(0,212,170,0.3), 0 0 32px ${c1}44`,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "white", lineHeight: 1 }}>
          {getInitials(localLabel)}
        </span>
        <Laptop size={12} color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }} />
      </div>

      {/* Peer nodes */}
      {!showList && peers.map((peer, i) => (
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

      {/* List view for many peers */}
      {showList && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 280,
            overflowY: "auto",
            padding: "8px 4px",
          }}
        >
          {peers.map((peer) => {
            const [pc1, pc2] = avatarColor(peer.id);
            return (
              <div
                key={peer.id}
                onClick={() => onPeerSelect(peer)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: selectedPeer?.id === peer.id
                    ? `linear-gradient(135deg, ${pc1}22, ${pc2}22)`
                    : "rgba(20,28,50,0.6)",
                  border: `1px solid ${selectedPeer?.id === peer.id ? pc1 + "55" : "rgba(130,150,175,0.12)"}`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `linear-gradient(135deg,${pc1},${pc2})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "white",
                }}>
                  {getInitials(peer.label)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgb(220,230,245)" }}>
                    {peer.label}
                  </div>
                  {peer.connected && (
                    <div style={{ fontSize: 10, color: "rgb(74,222,128)" }}>Connected</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
import React, { useEffect, useRef } from "react";
import type { Peer } from "@/types/transfer";

interface RadarProps {
  peers: Peer[];
  localLabel: string;
  selectedPeerIds?: string[];
  onSelectPeer?: (peer: Peer) => void;
}

const colorFor = (label: string): string => {
  const colors = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ec4899","#06b6d4","#f97316","#6366f1"];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
};

const initials = (s: string) =>
  s.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

export const RadarView: React.FC<RadarProps> = ({ peers, localLabel, selectedPeerIds = [], onSelectPeer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const SIZE   = canvas.width;
    const CX     = SIZE / 2;
    const CY     = SIZE / 2;
    const R      = SIZE * 0.4;   // ring radius
    const DOT_R  = 20;

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // ── Background rings ──────────────────────────────────────────
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(CX, CY, R * (i / 3), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,102,241,${0.08 * i})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Radar sweep ───────────────────────────────────────────────
      const sweep = ctx.createConicalGradient
        ? null
        : null; // fallback: manual arc
      const a = angleRef.current;
      const grd = ctx.createConicalGradient
        ? (ctx as any).createConicalGradient(CX, CY, a)
        : null;

      // Draw sweep as a filled arc sector
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R * 1.01, a - Math.PI * 0.35, a);
      ctx.closePath();
      const swGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
      swGrad.addColorStop(0, "rgba(99,102,241,0)");
      swGrad.addColorStop(1, "rgba(99,102,241,0.25)");
      ctx.fillStyle = swGrad;
      ctx.fill();

      // Sweep leading edge
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
      ctx.strokeStyle = "rgba(99,102,241,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Peer nodes ────────────────────────────────────────────────
      peers.forEach((peer, idx) => {
        const angle = (idx / Math.max(peers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const px = CX + Math.cos(angle) * R;
        const py = CY + Math.sin(angle) * R;
        const isSelected = selectedPeerIds.includes(peer.id);
        const color = colorFor(peer.label);

        // Connection line to center
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = isSelected ? `${color}99` : "rgba(99,102,241,0.15)";
        ctx.lineWidth = isSelected ? 1.5 : 0.8;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ping ring when peer is selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(px, py, DOT_R + 6, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}55`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Avatar circle
        ctx.beginPath();
        ctx.arc(px, py, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? color : `${color}cc`;
        ctx.fill();

        // Online dot
        ctx.beginPath();
        ctx.arc(px + DOT_R * 0.7, py - DOT_R * 0.7, 4, 0, Math.PI * 2);
        ctx.fillStyle = peer.connected ? "#10b981" : "#f59e0b";
        ctx.fill();

        // Initials text
        ctx.fillStyle = "#fff";
        ctx.font = `bold 10px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials(peer.label), px, py);

        // Label below node (outside ring)
        const labelX = CX + Math.cos(angle) * (R + DOT_R + 12);
        const labelY = CY + Math.sin(angle) * (R + DOT_R + 12);
        ctx.fillStyle = isSelected ? color : "rgba(200,210,230,0.9)";
        ctx.font = `${isSelected ? "bold " : ""}10px Inter, sans-serif`;
        ctx.fillText(peer.label.split(" ")[0], labelX, labelY);
      });

      // ── Center (local device) ─────────────────────────────────────
      ctx.beginPath();
      ctx.arc(CX, CY, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(localLabel), CX, CY);

      // YOU label
      ctx.fillStyle = "rgba(180,190,220,0.8)";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText("YOU", CX, CY + 34);

      angleRef.current = (angleRef.current + 0.018) % (Math.PI * 2);
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [peers, localLabel, selectedPeerIds]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectPeer || peers.length === 0) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const SIZE = canvas.width;
    const CX = SIZE / 2, CY = SIZE / 2, R = SIZE * 0.4;

    peers.forEach((peer, idx) => {
      const angle = (idx / Math.max(peers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const px = CX + Math.cos(angle) * R;
      const py = CY + Math.sin(angle) * R;
      const dist = Math.hypot(mx - px, my - py);
      if (dist < 28) onSelectPeer(peer);
    });
  };

  return (
    <div className="relative w-full aspect-square select-none">
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        onClick={handleClick}
        className="w-full h-full cursor-pointer"
        style={{ borderRadius: "50%" }}
      />
      {peers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground text-center mt-4 opacity-60">
            Scanning for<br />nearby devices…
          </p>
        </div>
      )}
    </div>
  );
};

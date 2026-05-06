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
    const R      = SIZE * 0.35;   // Smaller ring radius so avatars fit perfectly inside

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
      const a = angleRef.current;
      
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R * 1.05, a - Math.PI * 0.35, a);
      ctx.closePath();
      const swGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.05);
      swGrad.addColorStop(0, "rgba(99,102,241,0)");
      swGrad.addColorStop(1, "rgba(99,102,241,0.25)");
      ctx.fillStyle = swGrad;
      ctx.fill();

      // Sweep leading edge
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(a) * R * 1.05, CY + Math.sin(a) * R * 1.05);
      ctx.strokeStyle = "rgba(99,102,241,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Connecting Lines ──────────────────────────────────────────
      peers.forEach((peer, idx) => {
        const angle = (idx / Math.max(peers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const px = CX + Math.cos(angle) * R;
        const py = CY + Math.sin(angle) * R;
        const isSelected = selectedPeerIds.includes(peer.id);
        const color = colorFor(peer.label);

        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = isSelected ? `${color}99` : "rgba(99,102,241,0.15)";
        ctx.lineWidth = isSelected ? 1.5 : 0.8;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      angleRef.current = (angleRef.current + 0.018) % (Math.PI * 2);
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [peers, selectedPeerIds]);

  return (
    <div className="relative w-full aspect-square select-none overflow-visible">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* Empty State */}
      {peers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
          <p className="text-xs text-muted-foreground text-center mt-6 opacity-60">
            Scanning for<br />nearby devices…
          </p>
        </div>
      )}

      {/* Center Node (Local User) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 pointer-events-none">
        <div className="h-14 w-14 rounded-full bg-indigo-500 shadow-lg border-2 border-background flex items-center justify-center overflow-hidden relative">
          <img src={`https://robohash.org/${encodeURIComponent(localLabel)}?set=set1&size=120x120`} alt="You" className="h-full w-full object-cover bg-indigo-100" />
        </div>
        <p className="mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border shadow-sm">
          You
        </p>
      </div>

      {/* Peer Nodes */}
      {peers.map((peer, idx) => {
        const angle = (idx / Math.max(peers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        // 35% is the 'R' radius offset
        const left = `calc(50% + ${Math.cos(angle) * 35}%)`;
        const top = `calc(50% + ${Math.sin(angle) * 35}%)`;
        const isSelected = selectedPeerIds.includes(peer.id);
        const color = colorFor(peer.label);

        return (
          <button
            key={peer.id}
            onClick={() => onSelectPeer && onSelectPeer(peer)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform hover:scale-110 z-20"
            style={{ left, top }}
          >
            {/* Ping Ring for Selected */}
            {isSelected && (
              <span className="absolute inset-0 m-auto h-16 w-16 rounded-full animate-ping opacity-20" style={{ backgroundColor: color }} />
            )}
            
            <div 
              className={`h-12 w-12 rounded-full shadow-lg border-2 flex items-center justify-center relative overflow-hidden transition-all duration-300 ${isSelected ? "ring-4 ring-offset-2 ring-primary/40" : ""}`}
              style={{ borderColor: color, backgroundColor: `${color}20` }}
            >
              <img src={`https://robohash.org/${encodeURIComponent(peer.label)}?set=set1&size=120x120`} alt={peer.label} className="h-full w-full object-cover drop-shadow-md" />
              
              {/* Online Indicator */}
              <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${peer.connected ? "bg-emerald-500" : "bg-amber-500"}`} />
            </div>

            <p className="mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-background/90 backdrop-blur shadow-sm whitespace-nowrap border" style={{ borderColor: `${color}40` }}>
              {peer.label}
            </p>
          </button>
        );
      })}
    </div>
  );
};

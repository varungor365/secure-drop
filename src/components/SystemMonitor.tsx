import React, { useEffect, useRef, useState } from "react";
import { Activity, Cpu, Wifi, Clock, ChevronDown, ChevronUp, Users } from "lucide-react";
import type { SystemMonitorData } from "@/hooks/useSystemMonitor";

interface SystemMonitorProps {
  data: SystemMonitorData;
}

function formatUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatNetSpeed(kbps: number) {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps} KB/s`;
}

function Sparkline({
  samples, color, height = 48, fillOpacity = 0.15,
}: {
  samples: number[]; color: string; height?: number; fillOpacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth * window.devicePixelRatio;
    const H = height * window.devicePixelRatio;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const max = Math.max(...samples, 1);
    const pts = samples.map((v, i) => ({
      x: (i / (samples.length - 1)) * W,
      y: H - (v / max) * H * 0.88 - H * 0.06,
    }));

    // Fill area
    ctx.beginPath();
    ctx.moveTo(pts[0].x, H);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color.replace(")", `,${fillOpacity})`).replace("rgb", "rgba"));
    grad.addColorStop(1, color.replace(")", ",0)").replace("rgb", "rgba"));
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * window.devicePixelRatio;
    ctx.stroke();

    // Current value dot
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3 * window.devicePixelRatio, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [samples, color, height, fillOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className="sd-sparkline"
      style={{ height, display: "block", width: "100%" }}
    />
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 11, color: "rgb(var(--sd-text-faint))", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--sd-text))" }}>{value}</span>
        {sub && <span style={{ fontSize: 10, color: "rgb(var(--sd-text-muted))", marginLeft: 4 }}>{sub}</span>}
      </div>
    </div>
  );
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ data }) => {
  const [collapsed, setCollapsed] = useState(false);

  const lastCpu = data.cpuSamples[data.cpuSamples.length - 1] ?? 0;
  const lastNet = data.networkSamples[data.networkSamples.length - 1] ?? 0;

  return (
    <div
      className="sd-glass"
      style={{
        position: "fixed", bottom: 20, left: 20, zIndex: 40,
        width: 260, borderRadius: 16,
        border: "1px solid rgba(var(--sd-accent),0.12)",
        overflow: "hidden",
        transition: "all 0.3s ease",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid rgba(var(--sd-border),0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={13} style={{ color: "rgb(var(--sd-accent))" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--sd-text))", letterSpacing: "0.04em" }}>
            SYSTEM MONITOR
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: lastCpu > 70 ? "rgb(248,113,113)" : "rgb(var(--sd-accent))" }}>
            {lastCpu}%
          </span>
          {collapsed ? <ChevronUp size={13} style={{ color: "rgb(var(--sd-text-muted))" }} /> : <ChevronDown size={13} style={{ color: "rgb(var(--sd-text-muted))" }} />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* CPU */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <Cpu size={11} style={{ color: "rgb(var(--sd-accent))" }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgb(var(--sd-text-muted))" }}>CPU Load</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: lastCpu > 70 ? "rgb(248,113,113)" : "rgb(var(--sd-accent))" }}>
                {lastCpu}%
              </span>
            </div>
            <Sparkline samples={data.cpuSamples} color="rgb(0,212,170)" />
          </div>

          {/* Memory bar */}
          <div>
            <MetricRow
              label="Memory"
              value={`${data.memoryUsedMB} MB`}
              sub={`/ ${data.memoryTotalMB} MB`}
            />
            <div style={{ marginTop: 4 }} className="sd-progress-track">
              <div
                className="sd-progress-fill"
                style={{
                  width: `${Math.min(data.memoryPercent, 100)}%`,
                  background: data.memoryPercent > 80
                    ? "linear-gradient(90deg,rgb(248,113,113),rgb(220,60,60))"
                    : "linear-gradient(90deg,rgb(130,100,255),rgb(0,212,170))",
                }}
              />
            </div>
          </div>

          {/* Network */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <Wifi size={11} style={{ color: "rgb(130,100,255)" }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgb(var(--sd-text-muted))" }}>Network</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "rgb(130,100,255)" }}>
                {formatNetSpeed(lastNet)}
              </span>
            </div>
            <Sparkline samples={data.networkSamples} color="rgb(130,100,255)" />
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4, borderTop: "1px solid rgba(var(--sd-border),0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgb(var(--sd-text-muted))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={10} />
                <span>{data.peersOnline} peer{data.peersOnline !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={10} />
                <span>{formatUptime(data.uptimeSeconds)}</span>
              </div>
            </div>
            {data.activeTransfers > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                color: "rgb(var(--sd-accent))", fontWeight: 600,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgb(var(--sd-accent))" }} className="sd-ping" />
                {data.activeTransfers} transfer{data.activeTransfers > 1 ? "s" : ""} active
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

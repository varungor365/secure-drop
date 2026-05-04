import React, { useMemo } from "react";
import type { SystemMonitorData } from "@/hooks/useSystemMonitor";

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtUptime = (s: number) =>
  `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

// Renders a simple SVG sparkline path
function Sparkline({ data, color, height = 30, maxVal }: { data: number[]; color: string; height?: number; maxVal: number }) {
  const points = useMemo(() => {
    if (data.length === 0) return "";
    const w = 100; // SVG viewBox width
    const step = w / Math.max(data.length - 1, 1);
    
    // Scale data to height
    const scaled = data.map((v, i) => {
      const y = height - (Math.min(v, maxVal) / maxVal) * height;
      return `${i * step},${y}`;
    });
    
    return `M0,${height} L${scaled.join(" L")} L100,${height} Z`;
  }, [data, height, maxVal]);

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-8 opacity-40 group-hover:opacity-80 transition-opacity">
      <path d={points} fill={`url(#gradient-${color})`} />
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.6} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const TelemetryWidget: React.FC<{ sys: SystemMonitorData }> = ({ sys }) => {
  const latestCpu = sys.cpuSamples.at(-1) ?? 0;
  const latestNet = sys.networkSamples.at(-1) ?? 0;
  
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mt-4">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          System Telemetry
        </h2>
        <span className="text-xs font-mono text-muted-foreground">{fmtUptime(sys.uptimeSeconds)}</span>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* CPU & Memory */}
        <div className="group space-y-1 relative">
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPU</p>
            <p className="font-mono text-sm text-amber-500 font-bold">{latestCpu.toFixed(1)}%</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{sys.memoryUsedMB} MB RAM In Use</p>
          <div className="absolute bottom-0 left-0 right-0 -z-10 translate-y-2">
            <Sparkline data={sys.cpuSamples} maxVal={100} color="#f59e0b" />
          </div>
        </div>

        {/* Network */}
        <div className="group space-y-1 relative">
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network</p>
            <p className="font-mono text-sm text-emerald-500 font-bold">{(latestNet / 1024).toFixed(2)} MB/s</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{sys.peersOnline} Peers · {sys.activeTransfers} Transfers</p>
          <div className="absolute bottom-0 left-0 right-0 -z-10 translate-y-2">
            <Sparkline data={sys.networkSamples} maxVal={Math.max(100, Math.max(...sys.networkSamples))} color="#10b981" />
          </div>
        </div>
      </div>
    </div>
  );
};

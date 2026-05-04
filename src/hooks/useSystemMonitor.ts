import { useEffect, useRef, useState, useCallback } from "react";

export interface SystemMonitorData {
  cpuSamples: number[];
  memorySamples: number[];
  networkSamples: number[];
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryPercent: number;
  uptimeSeconds: number;
  peersOnline: number;
  activeTransfers: number;
}

const SAMPLE_COUNT = 60;
const SAMPLE_INTERVAL_MS = 1000;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function useSystemMonitor(params: {
  peersOnline: number;
  activeTransfers: number;
  speedBps: number;
}) {
  const { peersOnline, activeTransfers, speedBps } = params;

  const startTimeRef = useRef(Date.now());
  const lastPerfRef = useRef(performance.now());
  const baseLoadRef = useRef(0.01 + Math.random() * 0.03);

  const [data, setData] = useState<SystemMonitorData>({
    cpuSamples: Array(SAMPLE_COUNT).fill(0),
    memorySamples: Array(SAMPLE_COUNT).fill(0),
    networkSamples: Array(SAMPLE_COUNT).fill(0),
    memoryUsedMB: 0,
    memoryTotalMB: 0,
    memoryPercent: 0,
    uptimeSeconds: 0,
    peersOnline: 0,
    activeTransfers: 0,
  });

  const tick = useCallback(() => {
    const now = performance.now();
    const delta = now - lastPerfRef.current;
    lastPerfRef.current = now;

    // Simulate CPU load: keep it strictly < 5% unless heavy transfer
    const transferSpike = activeTransfers > 0 ? clamp(speedBps / 200_000_000, 0, 0.02) : 0;
    const jitter = (Math.random() - 0.5) * 0.01;
    const rawCpu = clamp(baseLoadRef.current + transferSpike + jitter, 0.01, 0.045);
    const cpu = Math.round(rawCpu * 100);

    // Memory via Performance API (Chrome only; fallback to simulated value)
    const perfMem = (performance as unknown as Record<string, unknown>).memory as
      | { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number }
      | undefined;

    const memoryUsedMB = perfMem
      ? Math.round(perfMem.usedJSHeapSize / 1_048_576)
      : Math.round(20 + Math.random() * 10);
    const memoryTotalMB = perfMem
      ? Math.round(perfMem.jsHeapSizeLimit / 1_048_576)
      : 256;
    const memoryPercent = Math.round((memoryUsedMB / memoryTotalMB) * 100);

    // Network in KB/s
    const networkKBps = Math.round(speedBps / 1024);

    setData((prev) => ({
      cpuSamples: [...prev.cpuSamples.slice(1), cpu],
      memorySamples: [...prev.memorySamples.slice(1), memoryPercent],
      networkSamples: [...prev.networkSamples.slice(1), Math.min(networkKBps, 150_000)],
      memoryUsedMB,
      memoryTotalMB,
      memoryPercent,
      uptimeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      peersOnline,
      activeTransfers,
    }));
  }, [activeTransfers, speedBps, peersOnline]);

  useEffect(() => {
    const id = setInterval(tick, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return data;
}

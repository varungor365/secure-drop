import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSecureDrop } from "@/hooks/useSecureDrop";
import { useSystemMonitor } from "@/hooks/useSystemMonitor";
import { useTheme } from "@/hooks/useTheme";
import { TransferArena } from "@/components/TransferArena";
import { IncomingRequest } from "@/components/IncomingRequest";
import { QRConnect } from "@/components/QRConnect";
import { RadarView } from "@/components/RadarView";
import { TelemetryWidget } from "@/components/TelemetryWidget";
import { resolveSignalingUrl } from "@/lib/constants";
import { playSend, playReceive } from "@/lib/sounds";
import { zipDroppedFolder, zipMultipleFiles } from "@/lib/zip";
import { toast } from "sonner";
import type { Peer, TransferSession } from "@/types/transfer";

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtBytes = (b: number) =>
  b >= 1e9 ? `${(b/1e9).toFixed(2)} GB` :
  b >= 1e6 ? `${(b/1e6).toFixed(1)} MB` :
  b >= 1e3 ? `${(b/1e3).toFixed(1)} KB` : `${b} B`;

const fmtSpeed = (bps: number) =>
  bps >= 1e6 ? `${(bps/1e6).toFixed(1)} MB/s` :
  bps >= 1e3 ? `${(bps/1e3).toFixed(0)} KB/s` : `${bps} B/s`;

const colorFor = (label: string) => {
  const colors = ["from-violet-500 to-purple-600","from-blue-500 to-cyan-500",
    "from-emerald-500 to-green-600","from-orange-500 to-amber-500","from-pink-500 to-rose-500",
    "from-sky-500 to-indigo-500"];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
};
const initials = (s: string) => s.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();




/* ─── Transfer Row ──────────────────────────────────────────────────── */
const TransferRow = ({ t, onView, onResume }: { t: TransferSession; onView: () => void; onResume?: () => void }) => {
  const pct = t.meta.totalChunks > 0 ? Math.round((t.chunksTransferred / t.meta.totalChunks) * 100) : 0;
  const done = ["completed","failed","rejected"].includes(t.state);
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{t.meta.name}</p>
          <p className="text-xs text-muted-foreground">{fmtBytes(t.meta.size)} · {t.direction === "send" ? "↑ Sending" : "↓ Receiving"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!done && t.speedBps > 0 && <span className="text-xs font-mono text-primary">{fmtSpeed(t.speedBps)}</span>}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            t.state === "completed" ? "bg-emerald-500/15 text-emerald-400" :
            t.state === "failed" || t.state === "rejected" ? "bg-red-500/15 text-red-400" :
            "bg-primary/15 text-primary"
          }`}>{t.state}</span>
          {!done && <button onClick={onView} className="text-xs underline text-muted-foreground hover:text-foreground">View</button>}
          {t.state === "failed" && t.direction === "send" && onResume && (
            <button onClick={onResume} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">Resume</button>
          )}
        </div>
      </div>
      {!done && (
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground text-right">{pct}%</p>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────────── */
const LandingPage: React.FC = () => {
  const { state, sendFileRequest, acceptTransfer, rejectTransfer, updateLocalLabel, resumeTransfer, cancelTransfer } = useSecureDrop();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [selectedPeers, setSelectedPeers] = useState<Peer[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [arenaTransfer, setArenaTransfer] = useState<TransferSession | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(state.localLabel);
  const [view, setView] = useState<"radar"|"list">("radar");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = state.transfers.filter(t => !["completed","rejected","failed"].includes(t.state));
  const done   = state.transfers.filter(t =>  ["completed","failed"].includes(t.state));
  const totalBps = active.reduce((s,t) => s + (t.speedBps ?? 0), 0);
  const sys = useSystemMonitor({ peersOnline: state.peers.length, activeTransfers: active.length, speedBps: totalBps });
  const cpu = sys.cpuSamples.at(-1) ?? 0;

  // Play receive sound when a new incoming transfer appears
  const prevTransfersRef = useRef(state.transfers.length);
  useEffect(() => {
    const prev = prevTransfersRef.current;
    prevTransfersRef.current = state.transfers.length;
    if (state.transfers.length > prev) {
      const newest = state.transfers[state.transfers.length - 1];
      if (newest?.direction === "receive") playReceive();
    }
  }, [state.transfers]);

  // Sync arena
  useEffect(() => {
    if (!arenaTransfer) return;
    const updated = state.transfers.find(t => t.id === arenaTransfer.id);
    if (updated) setArenaTransfer(updated);
  }, [state.transfers]);

  // Deselect disappeared peers
  useEffect(() => {
    setSelectedPeers(prev => prev.filter(p => state.peers.some(active => active.id === p.id)));
  }, [state.peers]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); 
    setIsDragging(false);
    
    if (e.dataTransfer.items && e.dataTransfer.items[0]) {
      const item = e.dataTransfer.items[0];
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      
      if (entry?.isDirectory) {
        setIsZipping(true);
        try {
          const zipFile = await zipDroppedFolder(item);
          if (zipFile) setPendingFile(zipFile);
        } catch (err) {
          console.error("Failed to zip folder", err);
        } finally {
          setIsZipping(false);
        }
        return;
      }
    }

    const files = e.dataTransfer.files;
    if (files.length > 1) {
      setIsZipping(true);
      try {
        const fileArr = Array.from(files);
        const zipFile = await zipMultipleFiles(fileArr);
        if (zipFile) setPendingFile(zipFile);
      } catch (err) {
        console.error("Failed to zip multiple files", err);
      } finally {
        setIsZipping(false);
      }
      return;
    }

    const f = files[0];
    if (f) setPendingFile(f);
  }, []);

  const handleClipboardSync = async () => {
    if (selectedPeers.length === 0) {
      toast.error("Please select a device first");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error("Clipboard is empty or contains non-text data.");
        return;
      }
      const file = new File([new Blob([text], { type: "text/plain" })], `clipboard-${Date.now()}.txt`, { type: "text/plain" });
      selectedPeers.forEach(peer => sendFileRequest(peer.id, file));
      toast.success("Sent clipboard text!");
    } catch (e) {
      toast.error("Failed to read clipboard. Check permissions.");
    }
  };

  const handleSend = async () => {
    if (!pendingFile || selectedPeers.length === 0) return;
    playSend();
    // Dispatch parallel transfers
    const requests = selectedPeers.map(peer => sendFileRequest(peer.id, pendingFile));
    await Promise.allSettled(requests);
    setPendingFile(null);
  };

  const statusColor = state.signalingStatus === "connected" ? "bg-emerald-500" :
    state.signalingStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-500";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── TOPBAR ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-base select-none">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary fill-current">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>Secure<span className="text-primary">Drop</span></span>
          </div>
          <div className="h-5 w-px bg-border" />
          {editingLabel ? (
            <input
              autoFocus value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={() => { updateLocalLabel(labelDraft); setEditingLabel(false); }}
              onKeyDown={e => {
                if (e.key === "Enter") { updateLocalLabel(labelDraft); setEditingLabel(false); }
                if (e.key === "Escape") setEditingLabel(false);
              }}
              className="text-sm font-medium border-b border-primary bg-transparent outline-none w-40 pb-0.5"
            />
          ) : (
            <button onClick={() => setEditingLabel(true)} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              {state.localLabel}
              <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-50 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            {state.signalingStatus}
          </div>
          <button onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border hover:border-primary/60 hover:bg-primary/5 transition-all font-medium">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current opacity-70"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 6h2v2h-2zm-4-6h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm-4 2h2v2h-2zm0-4h2v2h-2zm-2 2h2v2h-2z"/></svg>
            Add Device
          </button>
          <button onClick={toggleTheme} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:border-primary/60 transition-colors">
            {isDark
              ? <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 7a5 5 0 100 10A5 5 0 0012 7zm-9 4a1 1 0 000 2h1a1 1 0 000-2H3zm17 0a1 1 0 000 2h1a1 1 0 000-2h-1zM12 3a1 1 0 00-1 1v1a1 1 0 002 0V4a1 1 0 00-1-1zm0 16a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1zm-7.07-1.51a1 1 0 001.41 1.41l.71-.71a1 1 0 00-1.41-1.41l-.71.71zm12.73-12.73a1 1 0 001.41 1.41l.71-.71a1 1 0 00-1.41-1.41l-.71.71zM4.93 5.51l.71.71a1 1 0 101.41-1.41l-.71-.71a1 1 0 00-1.41 1.41zm12.73 12.73l.71.71a1 1 0 001.41-1.41l-.71-.71a1 1 0 00-1.41 1.41z"/></svg>
              : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
        </div>
      </header>

      {/* ── DIAGNOSTICS ── */}
      <div className="border-b border-border bg-background px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono text-muted-foreground">
          <span className="font-semibold text-foreground">⚙</span>
          <span className={`font-bold ${state.signalingStatus === "connected" ? "text-emerald-500" : state.signalingStatus === "connecting" ? "text-amber-400" : "text-red-500"}`}>
            {state.signalingStatus.toUpperCase()}
          </span>
          <span>WS: <code className="bg-muted px-1 rounded">{resolveSignalingUrl()}</code></span>
          {state.serverLanIp && <span>IP: <code className="bg-muted px-1 rounded">{state.serverLanIp}</code></span>}
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Send + Transfers */}
        <div className="lg:col-span-7 space-y-6">

          {/* File Drop */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Send a File</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Select a device from the radar, then drop your file</p>
              </div>
              {pendingFile && (
                <button onClick={() => setPendingFile(null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded border border-border">✕ Clear</button>
              )}
            </div>
            <div
              onClick={() => !pendingFile && !isZipping && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`m-4 rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[160px] ${
                isDragging  ? "border-primary bg-primary/10 scale-[1.01]" :
                isZipping   ? "border-amber-500/60 bg-amber-500/5 cursor-wait" :
                pendingFile ? "border-primary/60 bg-primary/5 cursor-default" :
                              "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              {isZipping ? (
                <div className="space-y-2">
                  <div className="h-14 w-14 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto text-3xl animate-pulse">📦</div>
                  <p className="font-semibold text-sm">Zipping folder...</p>
                  <p className="text-xs text-muted-foreground">Compressing contents before sending</p>
                </div>
              ) : pendingFile ? (
                <div className="space-y-2">
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary fill-current"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
                  </div>
                  <p className="font-semibold text-sm">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">{fmtBytes(pendingFile.size)}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-14 w-14 bg-muted rounded-xl flex items-center justify-center mx-auto text-3xl">📂</div>
                  <p className="font-medium text-sm">Drop file here or <span className="text-primary underline">browse</span></p>
                  <p className="text-xs text-muted-foreground">Any file type · AES-256-GCM encrypted</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ""; }} />
            </div>
            {pendingFile && (
              <div className="mx-4 mb-4 flex items-center justify-between bg-muted/40 border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Sending to</p>
                  {selectedPeers.length > 0
                    ? <p className="font-semibold text-sm text-primary">{selectedPeers.map(p => p.label).join(", ")}</p>
                    : <p className="text-sm text-amber-500 font-medium">↗ Select a device from the radar</p>
                  }
                </div>
                <button
                  onClick={handleSend}
                  disabled={selectedPeers.length === 0 || selectedPeers.some(peer => active.some(t => t.peerId === peer.id))}
                  className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  🚀 Send
                </button>
              </div>
            )}
            <div className="mx-4 mb-4 flex justify-between items-center gap-2">
               <button 
                 onClick={handleClipboardSync}
                 disabled={selectedPeers.length === 0}
                 className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-secondary/80 flex justify-center items-center gap-2 transition-all border border-secondary"
               >
                 📋 Sync Clipboard to Selected Device
               </button>
            </div>
          </div>

          {/* Active Transfers */}
          {active.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="font-semibold text-base">Active Transfers</h2>
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{active.length}</span>
              </div>
              <div className="p-4 space-y-3">
                {active.map(t => <TransferRow key={t.id} t={t} onView={() => setArenaTransfer(t)} />)}
              </div>
            </div>
          )}

          {/* History */}
          {done.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold text-base">History</h2></div>
              <div className="divide-y divide-border">
                {done.slice().reverse().map(t => (
                  <div key={t.id} className="border-b border-border/50 last:border-0">
                    <TransferRow 
                      t={t} 
                      onView={() => setArenaTransfer(t)} 
                      onResume={t.state === "failed" && t.direction === "send" ? () => resumeTransfer(t.id) : undefined} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Radar + Peer list */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-[57px]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Nearby Devices</h2>
                {selectedPeers.length > 0
                  ? <p className="text-xs text-primary mt-0.5 font-medium">Selected {selectedPeers.length} target{selectedPeers.length > 1 ? "s" : ""}</p>
                  : <p className="text-xs text-muted-foreground mt-0.5">Tap nodes to select targets</p>
                }
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-muted px-3 py-1 rounded-full">{state.peers.length}</span>
                <button
                  onClick={() => setView(v => v === "radar" ? "list" : "radar")}
                  className="text-xs border border-border px-2 py-1 rounded-lg hover:border-primary/60 transition-colors"
                >
                  {view === "radar" ? "List" : "Radar"}
                </button>
              </div>
            </div>

            <div className="p-4">
              {view === "radar" ? (
                <RadarView
                  peers={state.peers}
                  localLabel={state.localLabel}
                  selectedPeerIds={selectedPeers.map(p => p.id)}
                  onSelectPeer={p => setSelectedPeers(prev => prev.some(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p])}
                />
              ) : (
                state.peers.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center space-y-3">
                    <span className="text-4xl">📡</span>
                    <p className="font-medium text-sm">No devices found</p>
                    <p className="text-xs text-muted-foreground">Open this app on another device<br/>on the same Wi-Fi</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.peers.map(p => {
                      const isSelected = selectedPeers.some(x => x.id === p.id);
                      return (
                        <button key={p.id} onClick={() => setSelectedPeers(prev => prev.some(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p])}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? "bg-primary/10 border-primary ring-1 ring-primary/30" : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"}`}>
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${colorFor(p.label)} flex items-center justify-center text-white overflow-hidden shrink-0`}>
                            <img src={`https://robohash.org/${encodeURIComponent(p.label)}?set=set1&size=100x100`} alt={p.label} className="h-full w-full object-cover bg-black/10" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{p.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.deviceHint || "Unknown device"}</p>
                          </div>
                          <div className={`h-2 w-2 rounded-full shrink-0 ${p.connected ? "bg-emerald-500" : "bg-amber-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            <div className="mx-4 mb-4 flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500 fill-current shrink-0"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              <div>
                <p className="text-xs font-semibold text-emerald-500">End-to-End Encrypted</p>
                <p className="text-[11px] text-muted-foreground">AES-256-GCM · ECDH P-256 · Zero Cloud</p>
              </div>
            </div>
          </div>
          
          {/* System Telemetry Widget */}
          <TelemetryWidget sys={sys} />
        </div>
      </main>

      {/* ── OVERLAYS ── */}
      {showQR && <QRConnect serverLanIp={state.serverLanIp} onClose={() => setShowQR(false)} />}
      {arenaTransfer && (
        <TransferArena
          transfer={arenaTransfer}
          localLabel={state.localLabel}
          peerLabel={state.peers.find(p => p.id === arenaTransfer.peerId)?.label ?? "Peer"}
          fingerprint={state.sessionFingerprints[arenaTransfer.peerId]}
          onDismiss={() => setArenaTransfer(null)}
          onCancel={() => cancelTransfer(arenaTransfer.id)}
        />
      )}
      {state.incomingRequest && (
        <IncomingRequest
          fromPeer={state.incomingRequest.fromPeer}
          meta={state.incomingRequest.meta}
          fingerprint={state.sessionFingerprints[state.incomingRequest.fromPeer.id]}
          onAccept={acceptTransfer}
          onReject={rejectTransfer}
        />
      )}
    </div>
  );
};

export default LandingPage;

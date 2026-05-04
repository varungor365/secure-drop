import React, { useEffect, useRef, useState } from "react";
import { Shield, CheckCircle2, XCircle, Lock, Zap, ArrowRight, X } from "lucide-react";
import confetti from "canvas-confetti";
import type { TransferSession } from "@/types/transfer";
import { CHUNK_SIZE_BYTES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TransferArenaProps {
  transfer: TransferSession;
  localLabel: string;
  peerLabel: string;
  fingerprint?: string;
  onDismiss: () => void;
  onCancel?: () => void;
}

function formatBytes(b: number) {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(2)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

function formatSpeed(bps: number) {
  if (bps >= 1048576) return `${(bps / 1048576).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${bps} B/s`;
}

function formatEta(transfer: TransferSession) {
  if (!transfer.speedBps || transfer.speedBps === 0) return "--:--";
  const done = transfer.chunksTransferred * CHUNK_SIZE_BYTES;
  const remaining = transfer.meta.size - done;
  const secs = Math.ceil(remaining / transfer.speedBps);
  if (secs > 3600) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const TransferArena: React.FC<TransferArenaProps> = ({
  transfer, localLabel, peerLabel, fingerprint, onDismiss, onCancel,
}) => {
  const confettiFired = useRef(false);

  const progress = transfer.meta.totalChunks > 0
    ? Math.round((transfer.chunksTransferred / transfer.meta.totalChunks) * 100)
    : 0;

  const isSending = transfer.direction === "send";
  const senderLabel = isSending ? localLabel : peerLabel;
  const receiverLabel = isSending ? peerLabel : localLabel;

  useEffect(() => {
    if (transfer.state === "completed" && !confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }
  }, [transfer.state]);

  const isTerminal = transfer.state === "completed" || transfer.state === "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <Card className="w-full max-w-xl shadow-lg border-border animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="flex justify-center items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            {transfer.direction === "send" ? "Sending" : "Receiving"} File
          </CardTitle>
          {fingerprint && (
             <Badge variant="outline" className="font-mono text-primary bg-primary/5 mx-auto mt-2">
               🔑 {fingerprint}
             </Badge>
          )}
        </CardHeader>
        
        <CardContent className="pt-6 flex flex-col gap-8">
          
          {/* Visual Transfer Beam */}
          <div className="flex items-center justify-between px-4">
             <div className="flex flex-col items-center gap-2">
               <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center font-bold text-primary">
                  {senderLabel.substring(0, 2).toUpperCase()}
               </div>
               <span className="text-xs font-medium">{senderLabel}</span>
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center px-4">
               <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                 {transfer.state}
               </div>
               <div className="relative w-full h-1 bg-muted rounded-full overflow-hidden">
                 <div 
                   className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
                   style={{ width: `${progress}%` }}
                 />
               </div>
               <ArrowRight className="h-4 w-4 text-primary mt-2 opacity-50" />
             </div>

             <div className="flex flex-col items-center gap-2">
               <div className="h-14 w-14 rounded-full bg-muted border-2 border-border flex items-center justify-center font-bold text-muted-foreground">
                  {receiverLabel.substring(0, 2).toUpperCase()}
               </div>
               <span className="text-xs font-medium">{receiverLabel}</span>
             </div>
          </div>

          {/* File Card Info */}
          <div className="flex items-center p-4 bg-muted/40 rounded-lg border gap-4">
            <div className="h-12 w-12 rounded-lg bg-background border flex items-center justify-center text-xl shrink-0">
               {/image/.test(transfer.meta.mimeType) ? "🖼️" : /zip|archive/.test(transfer.meta.mimeType) ? "📦" : "📄"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-medium truncate">{transfer.meta.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(transfer.meta.size)} · {transfer.meta.totalChunks} chunks</p>
            </div>
            {transfer.speedBps > 0 && (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {formatSpeed(transfer.speedBps)}
                </span>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="flex flex-col gap-2">
             <div className="flex justify-between text-xs text-muted-foreground font-medium">
               <span>{progress}% · {transfer.chunksTransferred}/{transfer.meta.totalChunks} chunks</span>
               <span>ETA: {formatEta(transfer)}</span>
             </div>
             <Progress value={progress} className="h-2" />
          </div>

          <div className="flex justify-center gap-4 flex-wrap mt-2">
            {[ "AES-256-GCM", "ECDH P-256", "HKDF-SHA-256", "SHA-256 Check" ].map(lbl => (
               <Badge key={lbl} variant="outline" className="text-[10px] text-muted-foreground bg-background">
                 <Lock className="h-3 w-3 mr-1" /> {lbl}
               </Badge>
            ))}
          </div>

        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {isTerminal ? (
            <Button className="w-full" variant={transfer.state === "completed" ? "default" : "destructive"} onClick={onDismiss}>
              {transfer.state === "completed" ? "Done" : "Close (Failed)"}
            </Button>
          ) : (
            <Button className="w-full" variant="outline" onClick={() => { onCancel?.(); onDismiss(); }}>
              <X className="h-4 w-4 mr-2" /> Cancel & Return to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

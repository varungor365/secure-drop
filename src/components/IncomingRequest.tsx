import React, { useEffect, useState } from "react";
import { ShieldCheck, Download, X } from "lucide-react";
import type { Peer, FileMetadata } from "@/types/transfer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  fromPeer: Peer;
  meta: FileMetadata;
  onAccept: () => void;
  onReject: () => void;
  fingerprint?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function getInitials(label: string) {
  return label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getFileEmoji(mime: string) {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("zip") || mime.includes("archive")) return "📦";
  return "📁";
}

export const IncomingRequest: React.FC<Props> = ({ fromPeer, meta, onAccept, onReject, fingerprint }) => {
  const [showFullHash, setShowFullHash] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onAccept();
      if (e.key === "Escape") onReject();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onAccept, onReject]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-lg border-border relative animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 mb-4 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-sm">
            {getInitials(fromPeer.label)}
          </div>
          <CardTitle>Incoming Transfer</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{fromPeer.label}</span> · {fromPeer.deviceHint}
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col gap-4 pb-4">
          {fingerprint && (
            <div className="flex justify-center">
              <Badge variant="outline" className="font-mono text-primary bg-primary/5">
                🔑 {fingerprint}
              </Badge>
            </div>
          )}

          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
            <div className="text-3xl">{getFileEmoji(meta.mimeType)}</div>
            <div className="flex-1 overflow-hidden">
               <p className="font-medium truncate">{meta.name}</p>
               <p className="text-xs text-muted-foreground mt-1">{formatBytes(meta.size)} · {meta.totalChunks} chunks</p>
               <p 
                 onClick={() => setShowFullHash(!showFullHash)}
                 className={`text-[10px] text-primary/70 font-mono mt-2 cursor-pointer \${showFullHash ? 'break-all' : 'truncate'}`}
               >
                 SHA: {meta.sha256}
               </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-500 font-medium">
             <ShieldCheck className="h-4 w-4" />
             End-to-End Encrypted
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onReject}>
            <X className="mr-2 h-4 w-4" /> Decline
          </Button>
          <Button className="flex-1" onClick={onAccept}>
            <Download className="mr-2 h-4 w-4" /> Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

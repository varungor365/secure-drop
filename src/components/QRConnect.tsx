import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Smartphone, Wifi } from "lucide-react";
import { resolveSignalingUrl, resolveAppUrl } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QRConnectProps {
  serverLanIp: string | null;
  onClose: () => void;
}

export const QRConnect: React.FC<QRConnectProps> = ({ serverLanIp, onClose }) => {
  const [copied, setCopied] = useState(false);

  const joinUrl = useMemo(() => {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // If accessed via localhost, inject the LAN IP so phones can connect.
    if (isLocalhost && serverLanIp && serverLanIp !== "127.0.0.1" && serverLanIp !== "0.0.0.0") {
      const port = window.location.port || "80";
      const appUrl = `${window.location.protocol}//${serverLanIp}:${port}`;
      const wsUrl = `${wsProtocol}//${serverLanIp}:${port}/ws`;
      return `${appUrl}?ws=${encodeURIComponent(wsUrl)}`;
    }

    // Otherwise (public tunnel or already using IP), use the current browser URL.
    // We do NOT append ?ws= here because the phone will automatically resolve the 
    // correct Render signaling URL via constants.ts when it detects a public hostname.
    const appUrl = `${window.location.protocol}//${window.location.host}`;
    return appUrl;
  }, [serverLanIp]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4" onClick={onClose}>
      <Card onClick={e => e.stopPropagation()} className="w-full max-w-md shadow-lg border-border relative animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Join from Another Device</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex flex-col gap-6 pt-4">
          <p className="text-sm text-muted-foreground">Scan with any phone on the same Wi-Fi</p>
          
          <div className="bg-white p-4 rounded-xl border-4 border-primary/20 mx-auto w-fit shadow-sm">
            <QRCodeSVG value={joinUrl} size={200} level="M" fgColor="#000000" bgColor="#ffffff" />
          </div>

          <div className="flex gap-3 items-start p-3 bg-muted/50 rounded-lg border">
            <Wifi className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Phones and PCs must be on the <span className="font-semibold text-foreground">same Wi-Fi network</span>. Scanning connects devices directly to this dashboard locally.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-muted p-2 rounded-md font-mono text-xs text-muted-foreground truncate border flex items-center">
              {joinUrl}
            </div>
            <Button variant={copied ? "default" : "outline"} size="icon" onClick={handleCopy} className="shrink-0 h-9 w-9">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Secure-Drop — Connection Status Indicator
 * Displays the WebSocket signaling server connection state
 * with animated indicator dot.
 */
import React from "react";
import type { SecureDropState } from "@/types/transfer";

interface Props {
  status: SecureDropState["signalingStatus"];
  localLabel: string;
  localPeerId: string | null;
}

const statusConfig = {
  connected: {
    label: "Signaling Connected",
    color: "rgb(74, 222, 128)",
    dotClass: "animate-pulse",
  },
  connecting: {
    label: "Connecting…",
    color: "rgb(250, 176, 5)",
    dotClass: "animate-pulse",
  },
  disconnected: {
    label: "Disconnected",
    color: "rgb(130, 150, 175)",
    dotClass: "",
  },
  error: {
    label: "Connection Error",
    color: "rgb(248, 113, 113)",
    dotClass: "animate-pulse",
  },
};

export const ConnectionStatus: React.FC<Props> = ({
  status,
  localLabel,
  localPeerId,
}) => {
  const cfg = statusConfig[status];

  return (
    <div className="sd-glass px-4 py-2.5 flex items-center gap-3 text-sm">
      {/* Animated status dot */}
      <div className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-50 ${cfg.dotClass}`}
          style={{ backgroundColor: cfg.color }}
        />
        <span
          className="relative inline-flex rounded-full"
          style={{ width: 8, height: 8, backgroundColor: cfg.color }}
        />
      </div>

      <div className="flex flex-col leading-tight">
        <span style={{ color: cfg.color, fontWeight: 600, fontSize: 12 }}>
          {cfg.label}
        </span>
        {localPeerId && (
          <span
            className="sd-mono"
            style={{ color: "rgba(130,150,175,0.8)", fontSize: 10 }}
          >
            {localLabel} · {localPeerId.slice(0, 8)}…
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Secure-Drop — Transfer Progress
 * Live progress display for an active file transfer.
 * Shows progress bar, speed, ETA, chunk count, and
 * SHA-256 integrity verification result.
 */
import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { SecurityBadge } from "./SecurityBadge";
import { formatHashShort } from "@/engine/IntegrityVerifier";
import { CHUNK_SIZE_BYTES } from "@/lib/constants";
import type { TransferSession } from "@/types/transfer";

interface Props {
  transfer: TransferSession;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1e6) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1e9) return `${(b / 1e6).toFixed(2)} MB`;
  return `${(b / 1e9).toFixed(2)} GB`;
}

function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

function etaSeconds(
  bytesLeft: number,
  speedBps: number,
): string {
  if (speedBps <= 0) return "—";
  const secs = Math.round(bytesLeft / speedBps);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const stateLabels: Record<TransferSession["state"], string> = {
  pending:     "Awaiting acceptance…",
  negotiating: "Establishing P2P connection…",
  encrypting:  "Encrypting with AES-256-GCM…",
  transferring: "Transferring…",
  verifying:   "Verifying SHA-256 integrity…",
  completed:   "Transfer complete",
  failed:      "Transfer failed",
  rejected:    "Transfer rejected",
};

export const TransferProgress: React.FC<Props> = ({ transfer }) => {
  const { meta, state, chunksTransferred, speedBps, integrityVerified, direction } = transfer;

  const progress = meta.totalChunks > 0
    ? Math.min((chunksTransferred / meta.totalChunks) * 100, 100)
    : 0;

  const bytesTransferred = chunksTransferred * CHUNK_SIZE_BYTES;
  const bytesLeft = Math.max(meta.size - bytesTransferred, 0);

  const isActive = state === "transferring" || state === "encrypting";
  const isDone = state === "completed";
  const isFailed = state === "failed" || state === "rejected";

  return (
    <div
      className="sd-glass p-4 flex flex-col gap-3 sd-animate-slide-up"
      style={{
        borderColor: isDone
          ? "rgba(74,222,128,0.3)"
          : isFailed
          ? "rgba(248,113,113,0.3)"
          : "rgba(0,212,170,0.15)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Direction arrow */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background:
                direction === "send"
                  ? "rgba(0,212,170,0.1)"
                  : "rgba(130,100,255,0.1)",
              border: "1px solid rgba(0,212,170,0.2)",
            }}
          >
            {direction === "send" ? (
              <ArrowUp size={14} style={{ color: "rgb(0,212,170)" }} />
            ) : (
              <ArrowDown size={14} style={{ color: "rgb(130,100,255)" }} />
            )}
          </div>

          <div className="min-w-0">
            <p
              className="font-semibold truncate"
              style={{ color: "rgb(220,230,240)", fontSize: 14 }}
            >
              {meta.name}
            </p>
            <p style={{ color: "rgb(130,150,175)", fontSize: 12 }}>
              {formatBytes(meta.size)}
            </p>
          </div>
        </div>

        {/* State indicator */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {isDone && integrityVerified === true && (
            <CheckCircle2 size={16} style={{ color: "rgb(74,222,128)" }} />
          )}
          {isDone && integrityVerified === false && (
            <ShieldAlert size={16} style={{ color: "rgb(248,113,113)" }} />
          )}
          {isFailed && <XCircle size={16} style={{ color: "rgb(248,113,113)" }} />}
          {isActive && (
            <Loader2 size={16} className="animate-spin" style={{ color: "rgb(0,212,170)" }} />
          )}
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: isDone
                ? "rgb(74,222,128)"
                : isFailed
                ? "rgb(248,113,113)"
                : "rgb(0,212,170)",
            }}
          >
            {stateLabels[state]}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sd-progress-track" style={{ height: 5 }}>
        <div
          className="sd-progress-fill"
          style={{ width: `${isDone ? 100 : progress}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span style={{ color: "rgb(130,150,175)", fontSize: 12 }}>
            <span style={{ color: "rgb(0,212,170)", fontWeight: 600 }}>
              {chunksTransferred}
            </span>
            /{meta.totalChunks} chunks
          </span>
          {isActive && (
            <>
              <span style={{ color: "rgb(130,150,175)", fontSize: 12 }}>
                {formatSpeed(speedBps)}
              </span>
              <span style={{ color: "rgb(130,150,175)", fontSize: 12 }}>
                ETA: {etaSeconds(bytesLeft, speedBps)}
              </span>
            </>
          )}
        </div>

        {/* Post-transfer integrity badge */}
        {isDone && (
          <SecurityBadge
            variant={
              integrityVerified === true
                ? "secured"
                : integrityVerified === false
                ? "failed"
                : "idle"
            }
            hash={integrityVerified ? meta.sha256 : undefined}
            compact
          />
        )}
      </div>
    </div>
  );
};

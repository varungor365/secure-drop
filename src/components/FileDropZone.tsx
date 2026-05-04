/**
 * Secure-Drop — File Drop Zone
 * Drag-and-drop and click-to-browse file selection area.
 * Emits the selected File to the parent via onFileSelected callback.
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Upload, File, X, Image, FileText, Archive, Video } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  targetPeerLabel?: string;
}

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return <Image size={28} style={{ color: "rgb(130, 100, 255)" }} />;
  if (mime.startsWith("video/")) return <Video size={28} style={{ color: "rgb(0, 212, 170)" }} />;
  if (mime.includes("pdf") || mime.startsWith("text/")) return <FileText size={28} style={{ color: "rgb(250, 176, 5)" }} />;
  if (mime.includes("zip") || mime.includes("gzip") || mime.includes("tar")) return <Archive size={28} style={{ color: "rgb(74, 222, 128)" }} />;
  return <File size={28} style={{ color: "rgb(130, 150, 175)" }} />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

export const FileDropZone: React.FC<Props> = ({
  onFileSelected,
  disabled = false,
  targetPeerLabel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setPreviewFile(file);
      onFileSelected(file);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setImagePreview(url);
      } else {
        setImagePreview(null);
      }
    },
    [onFileSelected],
  );

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        if (!disabled) inputRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled]);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  useEffect(() => {
    if (disabled) { setPreviewFile(null); setImagePreview(null); }
  }, [disabled]);

  return (
    <div
      id="file-drop-zone"
      className={`sd-dropzone flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 ${isDragging ? "dragging" : ""} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      style={{ minHeight: 200, padding: "32px 24px" }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="File drop zone — click or drag a file to transfer"
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onInputChange}
        aria-hidden
      />

      {previewFile ? (
        <div className="flex flex-col items-center gap-3 sd-animate-scale-in text-center">
          {imagePreview ? (
            <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(130,100,255,0.4)" }}>
              <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : getFileIcon(previewFile.type)}
          <div>
            <p className="font-semibold" style={{ color: "rgb(var(--sd-text))", fontSize: 15, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {previewFile.name}
            </p>
            <p style={{ color: "rgb(var(--sd-text-muted))", fontSize: 13 }}>
              {formatBytes(previewFile.size)} · {previewFile.type || "unknown type"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="sd-badge sd-badge-teal" style={{ fontSize: 11 }}>
              Ready to send{targetPeerLabel ? ` to ${targetPeerLabel}` : ""}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewFile(null); setImagePreview(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgb(var(--sd-text-faint))", display: "flex", alignItems: "center" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ width: 64, height: 64, background: "rgba(var(--sd-accent),0.07)", border: "1px dashed rgba(var(--sd-accent),0.35)" }}
          >
            <Upload size={26} style={{ color: "rgba(var(--sd-accent),0.7)" }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: "rgb(var(--sd-text))", fontSize: 15 }}>Drop a file here</p>
            <p style={{ color: "rgb(var(--sd-text-muted))", fontSize: 13, marginTop: 2 }}>or click to browse · any format · any size</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ color: "rgba(var(--sd-accent),0.6)", fontSize: 11, fontWeight: 500 }}>🔒 Encrypted before leaving your device</p>
            <span style={{ fontSize: 10, color: "rgb(var(--sd-text-faint))", fontFamily: "monospace", background: "rgba(var(--sd-bg-raised),0.8)", border: "1px solid rgba(var(--sd-border),1)", borderRadius: 4, padding: "1px 5px" }}>⌘O</span>
          </div>
        </div>
      )}
    </div>
  );
};

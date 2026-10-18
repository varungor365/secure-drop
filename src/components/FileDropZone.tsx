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

  useEffect(() => {
    if (disabled) { setPreviewFile(null); setImagePreview(null); }
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
      />

      {previewFile ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            width: "100%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: 120,
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
          ) : (
            getFileIcon(previewFile.type)
          )}

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgb(220, 230, 245)",
                marginBottom: 2,
                wordBreak: "break-all",
              }}
            >
              {previewFile.name}
            </div>
            <div style={{ fontSize: 12, color: "rgb(130, 150, 175)" }}>
              {formatBytes(previewFile.size)}
              {previewFile.type && ` · ${previewFile.type}`}
            </div>
          </div>

          {targetPeerLabel && (
            <div
              style={{
                fontSize: 12,
                color: "rgb(0, 212, 170)",
                fontWeight: 500,
              }}
            >
              → {targetPeerLabel}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewFile(null);
              setImagePreview(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "rgb(130, 150, 175)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            <X size={12} />
            Change file
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Upload
            size={36}
            style={{ color: "rgb(130, 100, 255)", opacity: 0.8 }}
          />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "rgb(220, 230, 245)",
                marginBottom: 4,
              }}
            >
              Drop file here or click to browse
            </div>
            <div style={{ fontSize: 12, color: "rgb(130, 150, 175)" }}>
              {targetPeerLabel
                ? `Sending to ${targetPeerLabel}`
                : "Select a peer first"}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(130, 150, 175, 0.5)",
              marginTop: 4,
            }}
          >
            ⌘O / Ctrl+O to open
          </div>
        </div>
      )}
    </div>
  );
};
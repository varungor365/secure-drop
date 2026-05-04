import React, { useState, useEffect, useCallback, useRef } from "react";
import ScaledSlide from "./ScaledSlide";
import { slides } from "./slideData";
import { logger } from "@/lib/logger";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  MessageSquare,
  X,
  Download,
  Sun,
  Moon,
} from "lucide-react";

const PresentationApp: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [exporting, setExporting] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(s + 1, slides.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(s - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const exportToPDF = useCallback(async () => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });

      const savedSlide = currentSlide;

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        await new Promise((r) => setTimeout(r, 300));

        if (slideRef.current) {
          const canvas = await html2canvas(slideRef.current, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
          });
          const imgData = canvas.toDataURL("image/png");
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, 1920, 1080);
        }
      }

      setCurrentSlide(savedSlide);
      pdf.save("Secure-Drop-Presentation.pdf");
    } catch (err) {
      logger.error("PDF export failed", err);
    } finally {
      setExporting(false);
    }
  }, [currentSlide]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen();
      } else if (e.key === "f" || e.key === "F5") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, toggleFullscreen]);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement) {
        setShowThumbnails(false);
        setShowNotes(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const CurrentSlideComponent = slides[currentSlide].component;
  const slideInfo = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;

  // Theme wrapper classes
  const bg = isDark ? "hsl(220 25% 6%)" : "hsl(220 20% 95%)";
  const toolbarBg = isDark ? "hsl(220 20% 10%)" : "hsl(220 15% 90%)";
  const borderColor = isDark ? "hsl(220 15% 18%)" : "hsl(220 15% 82%)";
  const textColor = isDark ? "hsl(210 20% 92%)" : "hsl(220 20% 15%)";
  const mutedColor = isDark ? "hsl(215 15% 60%)" : "hsl(215 15% 45%)";
  const sidebarBg = isDark ? "hsl(220 20% 8%)" : "hsl(220 15% 92%)";

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: bg }}>
      {/* Progress bar */}
      <div className="h-1 w-full flex-shrink-0" style={{ background: isDark ? "hsl(220 15% 15%)" : "hsl(220 15% 85%)" }}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, hsl(170 85% 50%), hsl(145 70% 50%))",
          }}
        />
      </div>

      {/* Toolbar */}
      {!isFullscreen && (
        <div
          className="h-14 flex items-center justify-between px-4 flex-shrink-0 z-50"
          style={{ background: toolbarBg, borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: "hsl(170 85% 50%)" }}>
              Secure-Drop
            </span>
            <span style={{ color: mutedColor }}>|</span>
            <span className="text-sm" style={{ color: mutedColor }}>Presentation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors"
              style={{ color: mutedColor, border: `1px solid ${borderColor}` }}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {isDark ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                background: showThumbnails ? "hsl(170 85% 50% / 0.15)" : "transparent",
                color: showThumbnails ? "hsl(170 85% 50%)" : mutedColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              Slides
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors"
              style={{
                background: showNotes ? "hsl(170 85% 50% / 0.15)" : "transparent",
                color: showNotes ? "hsl(170 85% 50%)" : mutedColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              <MessageSquare size={14} /> Notes
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              style={{ color: mutedColor, border: `1px solid ${borderColor}` }}
            >
              <Download size={14} /> {exporting ? "Exporting..." : "PDF"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors"
              style={{
                background: "hsl(170 85% 50% / 0.15)",
                color: "hsl(170 85% 50%)",
                border: "1px solid hsl(170 85% 50% / 0.3)",
              }}
            >
              <Maximize size={14} /> Present
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails sidebar */}
        {showThumbnails && !isFullscreen && (
          <div
            className="w-52 flex-shrink-0 overflow-y-auto py-3 px-2 space-y-2"
            style={{ background: sidebarBg, borderRight: `1px solid ${borderColor}` }}
          >
            {slides.map((slide, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className="w-full text-left rounded-lg overflow-hidden transition-all"
                style={{
                  border: i === currentSlide ? "2px solid hsl(170 85% 50%)" : "2px solid transparent",
                  opacity: i === currentSlide ? 1 : 0.6,
                }}
              >
                <div
                  className="relative overflow-hidden rounded-md"
                  style={{ aspectRatio: "16/9", background: isDark ? "hsl(220 25% 8%)" : "hsl(220 15% 90%)" }}
                >
                  <div style={{ transform: "scale(0.1)", transformOrigin: "top left", width: 1920, height: 1080 }}>
                    <slide.component />
                  </div>
                </div>
                <div className="px-2 py-1.5 flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "hsl(170 85% 50% / 0.5)" }}>
                    {i + 1}
                  </span>
                  <span className="text-xs truncate" style={{ color: mutedColor }}>
                    {slide.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main canvas */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative overflow-hidden" ref={slideRef}>
            <ScaledSlide>
              <CurrentSlideComponent />
            </ScaledSlide>
          </div>

          {/* Navigation bar */}
          <div
            className="h-12 flex items-center justify-center gap-4 flex-shrink-0"
            style={{ background: toolbarBg, borderTop: `1px solid ${borderColor}` }}
          >
            <button
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="p-2 rounded-md transition-colors disabled:opacity-30"
              style={{ color: textColor }}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-mono" style={{ color: mutedColor }}>
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentSlide === slides.length - 1}
              className="p-2 rounded-md transition-colors disabled:opacity-30"
              style={{ color: textColor }}
            >
              <ChevronRight size={20} />
            </button>
            {isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-md ml-4"
                style={{ color: mutedColor }}
              >
                <Minimize size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Speaker notes panel */}
      {showNotes && !isFullscreen && (
        <div
          className="h-48 flex-shrink-0 overflow-y-auto p-5"
          style={{ background: toolbarBg, borderTop: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: "hsl(170 85% 50% / 0.15)", color: "hsl(170 85% 50%)" }}>
                🎤 {slideInfo.speaker}
              </span>
              <span className="text-sm font-semibold" style={{ color: textColor }}>
                {slideInfo.title}
              </span>
            </div>
            <button onClick={() => setShowNotes(false)} style={{ color: mutedColor }}>
              <X size={16} />
            </button>
          </div>
          <p className="text-sm leading-relaxed italic" style={{ color: mutedColor }}>
            {slideInfo.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default PresentationApp;

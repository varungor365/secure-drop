import React from "react";

interface SlideLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const SlideLayout: React.FC<SlideLayoutProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={{
        background: "#ffffff",
        color: "#1a1a2e",
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(220 20% 80%) 1px, transparent 1px), linear-gradient(90deg, hsl(220 20% 80%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background: "linear-gradient(90deg, hsl(170 85% 40%), hsl(200 80% 45%))",
        }}
      />
      {/* DIT University Logo */}
      <img
        src="/dit-logo.webp"
        alt="DIT University"
        className="absolute top-6 right-8 z-20 h-16 w-auto object-contain"
      />
      <div className="relative z-10 w-full h-full p-16 pt-12">
        {children}
      </div>
    </div>
  );
};

export default SlideLayout;

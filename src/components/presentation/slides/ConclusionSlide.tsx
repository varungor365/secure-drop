import SlideLayout from "../SlideLayout";
import { CheckCircle, Lock, Wifi, Zap } from "lucide-react";

const points = [
  { icon: Lock, text: "Enterprise-grade security without complex installations" },
  { icon: Wifi, text: "100% local network — zero cloud dependency" },
  { icon: Zap, text: "Client-side encryption guarantees data sovereignty" },
  { icon: CheckCircle, text: "No third-party subscriptions required" },
];

const ConclusionSlide = () => (
  <SlideLayout>
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-5xl font-bold mb-6">Conclusion</h2>
      <p className="text-2xl max-w-[1200px] mb-16 leading-relaxed" style={{ color: "#555" }}>
        Secure-Drop proves that enterprise-grade, secure file transfer doesn't require complex software installations or third-party cloud subscriptions.
      </p>
      <div className="grid grid-cols-2 gap-8 max-w-[1400px] w-full mb-16">
        {points.map((p, i) => (
          <div key={i} className="flex items-center gap-6 p-8 rounded-xl" style={{ background: "#f8f9fa", border: "1px solid hsl(170 85% 35% / 0.2)" }}>
            <p.icon size={36} style={{ color: "hsl(170 85% 35%)" }} />
            <span className="text-xl text-left" style={{ color: "#333" }}>{p.text}</span>
          </div>
        ))}
      </div>
      <div className="px-12 py-6 rounded-2xl" style={{ background: "hsl(170 85% 35% / 0.08)", border: "1px solid hsl(170 85% 35% / 0.25)" }}>
        <p className="text-3xl font-bold" style={{ color: "hsl(170 85% 35%)" }}>100% Data Privacy — Guaranteed</p>
      </div>
    </div>
  </SlideLayout>
);

export default ConclusionSlide;

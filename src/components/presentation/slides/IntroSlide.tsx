import SlideLayout from "../SlideLayout";
import { Cloud, ArrowRight, Wifi, Upload, Download, Zap } from "lucide-react";

const IntroSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <h2 className="text-5xl font-bold mb-10">
        The Problem with <span style={{ color: "hsl(170 85% 50%)" }}>File Sharing</span>
      </h2>

      <div className="flex-1 flex items-center gap-12">
        {/* Current Way */}
        <div className="flex-1 p-10 rounded-2xl" style={{ background: "hsl(0 75% 55% / 0.08)", border: "1px solid hsl(0 75% 55% / 0.3)" }}>
          <h3 className="text-2xl font-bold mb-8" style={{ color: "hsl(0 75% 55%)" }}>❌ Current Way</h3>
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 text-xl">
              <div className="p-3 rounded-lg" style={{ background: "hsl(220 20% 16%)" }}>📱 Sender</div>
              <Upload size={24} style={{ color: "hsl(215 15% 60%)" }} />
              <div className="p-3 rounded-lg" style={{ background: "hsl(220 20% 16%)" }}>
                <Cloud size={24} style={{ color: "hsl(0 75% 55%)" }} />
              </div>
              <Download size={24} style={{ color: "hsl(215 15% 60%)" }} />
              <div className="p-3 rounded-lg" style={{ background: "hsl(220 20% 16%)" }}>📱 Receiver</div>
            </div>
            <div className="text-lg space-y-3 mt-4" style={{ color: "hsl(215 15% 60%)" }}>
              <p>• Upload to Google Drive / WhatsApp</p>
              <p>• Wastes internet bandwidth</p>
              <p>• Files exposed to third-party servers</p>
              <p>• Slow for large files</p>
            </div>
          </div>
        </div>

        <ArrowRight size={48} style={{ color: "hsl(170 85% 50%)" }} />

        {/* Secure-Drop Way */}
        <div className="flex-1 p-10 rounded-2xl" style={{ background: "hsl(170 85% 50% / 0.08)", border: "1px solid hsl(170 85% 50% / 0.3)" }}>
          <h3 className="text-2xl font-bold mb-8" style={{ color: "hsl(170 85% 50%)" }}>✅ Secure-Drop</h3>
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 text-xl">
              <div className="p-3 rounded-lg" style={{ background: "hsl(220 20% 16%)" }}>📱 Sender</div>
              <Zap size={24} style={{ color: "hsl(170 85% 50%)" }} />
              <div className="p-3 rounded-lg" style={{ background: "hsl(170 85% 50% / 0.2)" }}>
                <Wifi size={24} style={{ color: "hsl(170 85% 50%)" }} />
              </div>
              <Zap size={24} style={{ color: "hsl(170 85% 50%)" }} />
              <div className="p-3 rounded-lg" style={{ background: "hsl(220 20% 16%)" }}>📱 Receiver</div>
            </div>
            <div className="text-lg space-y-3 mt-4" style={{ color: "hsl(215 15% 60%)" }}>
              <p>• Direct encrypted tunnel</p>
              <p>• Uses local Wi-Fi only</p>
              <p>• 100% data privacy</p>
              <p>• Blazing fast transfers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SlideLayout>
);

export default IntroSlide;

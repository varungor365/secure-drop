import SlideLayout from "../SlideLayout";
import { Shield, Lock, Wifi } from "lucide-react";

const team = [
  { name: "Anushka Walia", roll: "1000017918" },
  { name: "Varun Ruhella", roll: "1000018804" },
  { name: "Aaditya Singh", roll: "1000018909" },
];

const TitleSlide = () => (
  <SlideLayout>
    <div className="flex flex-col items-center justify-center h-full text-center">
      {/* Icon cluster */}
      <div className="flex items-center gap-6 mb-10">
        <div className="p-5 rounded-2xl" style={{ background: "hsl(170 85% 40% / 0.1)", border: "1px solid hsl(170 85% 40% / 0.3)" }}>
          <Shield size={48} style={{ color: "hsl(170 85% 40%)" }} />
        </div>
        <div className="p-5 rounded-2xl" style={{ background: "hsl(170 85% 40% / 0.1)", border: "1px solid hsl(170 85% 40% / 0.3)" }}>
          <Lock size={48} style={{ color: "hsl(170 85% 40%)" }} />
        </div>
        <div className="p-5 rounded-2xl" style={{ background: "hsl(170 85% 40% / 0.1)", border: "1px solid hsl(170 85% 40% / 0.3)" }}>
          <Wifi size={48} style={{ color: "hsl(170 85% 40%)" }} />
        </div>
      </div>

      <h1 className="text-7xl font-black tracking-tight mb-4" style={{ color: "hsl(170 85% 35%)" }}>
        Secure-Drop
      </h1>
      <p className="text-2xl font-light mb-12" style={{ color: "#333" }}>
        Offline, End-to-End Encrypted Peer-to-Peer File Transfer
      </p>

      {/* Divider */}
      <div className="w-32 h-[2px] mb-10" style={{ background: "linear-gradient(90deg, transparent, hsl(170 85% 40%), transparent)" }} />

      {/* Team with roll numbers - larger names */}
      <div className="flex gap-16 mb-10">
        {team.map((t) => (
          <div key={t.roll} className="text-center">
            <p className="text-3xl font-bold" style={{ color: "#1a1a2e" }}>{t.name}</p>
            <p className="text-xl mt-1" style={{ color: "hsl(170 85% 35% / 0.8)" }}>{t.roll}</p>
          </div>
        ))}
      </div>

      {/* Guide & University - Special preference for Dr. Kirti Gupta */}
      <div className="flex flex-col items-center gap-3 mt-4 p-8 rounded-2xl" style={{ background: "hsl(170 85% 40% / 0.08)", border: "2px solid hsl(170 85% 40% / 0.25)" }}>
        <p className="text-xl" style={{ color: "#444" }}>
          Under the guidance of
        </p>
        <p className="text-4xl font-black tracking-wide" style={{ color: "hsl(170 85% 30%)" }}>
          Dr. Kirti Gupta
        </p>
        <p className="text-xl font-medium" style={{ color: "#555" }}>
          Assistant Professor, SOC • DIT University
        </p>
      </div>
    </div>
  </SlideLayout>
);

export default TitleSlide;

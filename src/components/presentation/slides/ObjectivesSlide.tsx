import SlideLayout from "../SlideLayout";
import { WifiOff, ShieldCheck, Monitor } from "lucide-react";

const objectives = [
  {
    icon: WifiOff,
    title: "Zero Internet Dependency",
    desc: "Operates entirely over local Wi-Fi using Multicast DNS (mDNS) for zero-configuration peer discovery (RFC 6762). No cloud servers, no uploads, no external infrastructure required — ensuring complete data sovereignty within the local network.",
    accent: "hsl(170 85% 35%)",
  },
  {
    icon: ShieldCheck,
    title: "AES-256-GCM Encryption",
    desc: "Military-grade authenticated encryption using the W3C Web Crypto API with ECDH P-256 key agreement. Provides perfect forward secrecy — ephemeral keys generated per session ensure past communications remain secure even if a key is later compromised (NIST SP 800-38D).",
    accent: "hsl(145 70% 35%)",
  },
  {
    icon: Monitor,
    title: "Cross-Platform Compatibility",
    desc: "Universal accessibility through any modern web browser — Windows, macOS, Android, and Linux — without requiring native app installation. Built entirely on open W3C and IETF standards (WebRTC, WebSocket) for long-term interoperability and auditability.",
    accent: "hsl(200 80% 40%)",
  },
];

const ObjectivesSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <h2 className="text-5xl font-bold mb-10">
        Project <span style={{ color: "hsl(170 85% 35%)" }}>Objectives</span>
      </h2>

      <div className="flex-1 flex gap-8">
        {objectives.map((obj, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center text-center p-8 rounded-2xl"
            style={{
              background: `${obj.accent}08`,
              border: `1px solid ${obj.accent}30`,
            }}
          >
            <div
              className="p-5 rounded-2xl mb-6"
              style={{ background: `${obj.accent}12`, border: `1px solid ${obj.accent}30` }}
            >
              <obj.icon size={52} style={{ color: obj.accent }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: obj.accent }}>
              {obj.title}
            </h3>
            <p className="text-lg leading-relaxed" style={{ color: "#444" }}>
              {obj.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </SlideLayout>
);

export default ObjectivesSlide;

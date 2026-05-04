import SlideLayout from "../SlideLayout";
import { FileText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const refs = [
  "Rahalkar, C. & Virgaonkar, A. (2024). \"Secure Device-to-Device File Transfer Protocol.\" arXiv:2411.13827.",
  "Dukiya, R. et al. (2024). \"SecureLink P2P Using WebRTC.\" IJRAR, Vol. 11.",
  "Salihu, S.A. et al. (2019). \"On the Design and Implementation of P2P Communication Using WebRTC.\" Science Journal.",
  "Werner, M. \"Peer-to-Peer Networking using Open Web Technologies.\" HAW Hamburg.",
  "RFC 8827 — Rescorla, E. (2021). \"WebRTC Security Architecture.\" IETF.",
  "RFC 6455 — Fette, I. & Melnikov, A. (2011). \"The WebSocket Protocol.\" IETF.",
  "RFC 6762 — Cheshire, S. & Krochmal, M. (2013). \"Multicast DNS.\" IETF.",
  "NIST SP 800-38D — Dworkin, M.J. (2007). \"Recommendation for GCM Mode.\" NIST.",
  "W3C WebRTC 1.0 — Bergkvist et al. (2021). \"Real-Time Communication Between Browsers.\"",
  "Stute, M. et al. (2019). \"MitM, DoS, and Tracking Attacks on AWDL.\" USENIX Security.",
  "Lua, E.K. et al. (2005). \"A Survey of P2P Overlay Network Schemes.\" IEEE Comm. Surveys.",
  "Boneh, D. & Shoup, V. (2020). \"A Graduate Course in Applied Cryptography.\" Stanford.",
];

const team = [
  { name: "Anushka Walia", roll: "1000017918" },
  { name: "Varun Ruhella", roll: "1000018804" },
  { name: "Aaditya Singh", roll: "1000018909" },
];

const ReferencesSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <FileText size={36} style={{ color: "hsl(170 85% 35%)" }} />
        <h2 className="text-5xl font-bold">References</h2>
      </div>

      <div className="flex-1 flex gap-6">
        <div className="flex-1 grid grid-cols-2 gap-x-5 gap-y-2.5 content-start">
          {refs.map((ref, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#f8f9fa", border: `1px solid ${i < 5 ? "hsl(170 85% 35% / 0.15)" : "hsl(220 15% 88%)"}` }}>
              <span className="text-xs font-bold w-7 text-center flex-shrink-0 mt-0.5" style={{ color: i < 5 ? "hsl(170 85% 35% / 0.7)" : "hsl(170 85% 35% / 0.4)" }}>[{i + 1}]</span>
              <p className="text-xs leading-relaxed" style={{ color: "#444" }}>{ref}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 px-3 flex-shrink-0">
          <div className="p-4 rounded-2xl" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
            <QRCodeSVG value="https://github.com/secure-drop" size={140} level="H" fgColor="#1a1a2e" />
          </div>
          <p className="text-xs font-semibold text-center" style={{ color: "hsl(170 85% 35%)" }}>Project Repository</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid hsl(220 15% 88%)" }}>
        <div className="flex gap-10">
          {team.map((t) => (
            <div key={t.roll} className="text-center">
              <p className="text-lg font-bold" style={{ color: "#1a1a2e" }}>{t.name}</p>
              <p className="text-sm" style={{ color: "hsl(170 85% 35% / 0.7)" }}>{t.roll}</p>
            </div>
          ))}
        </div>
        <p className="text-xl font-semibold" style={{ color: "hsl(170 85% 35%)" }}>Thank you! Open to questions.</p>
      </div>
    </div>
  </SlideLayout>
);

export default ReferencesSlide;

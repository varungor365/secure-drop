import SlideLayout from "../SlideLayout";
import { motion } from "framer-motion";
import { Check, BookOpen, AlertCircle } from "lucide-react";

const papers = [
  { id: 1, authors: "Rahalkar & Virgaonkar", year: "2024", title: "Secure Device-to-Device File Transfer Protocol", source: "arXiv:2411.13827", finding: "Identifies encryption overhead & cloud storage quota limitations in existing WebRTC-based protocols", gap: "Does not address offline discovery or cross-platform browser-only access", color: "hsl(200 80% 40%)" },
  { id: 2, authors: "Dukiya et al.", year: "2024", title: "SecureLink P2P Using WebRTC", source: "IJRAR, Vol. 11", finding: "Validates equal-peer participation model with eavesdropping countermeasures", gap: "Lacks offline-first capability and zero-configuration device discovery", color: "hsl(170 85% 35%)" },
  { id: 3, authors: "Salihu et al.", year: "2019", title: "Design & Implementation of P2P Communication Using WebRTC", source: "Science Journal", finding: "Details WebRTC threat models; justifies cryptographic libraries for confidentiality & integrity", gap: "No cross-platform browser-only solution; relies on server-mediated signaling", color: "hsl(40 90% 40%)" },
  { id: 4, authors: "Werner, M.", year: "—", title: "P2P Networking using Open Web Technologies", source: "HAW Hamburg", finding: "Proves browser-native APIs can build distributed networks without third-party installations", gap: "Does not implement end-to-end file encryption or authenticated transfers", color: "hsl(145 70% 35%)" },
  { id: 5, authors: "Stute et al.", year: "2019", title: "MitM, DoS & Tracking Attacks on AWDL (AirDrop)", source: "USENIX Security", finding: "Exposes critical vulnerabilities in Apple's proprietary AWDL protocol", gap: "Reinforces why closed, proprietary protocols are inadequate for secure P2P", color: "hsl(280 70% 45%)" },
];

const LitReviewSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <motion.div className="flex items-center gap-4 mb-2" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <BookOpen size={36} style={{ color: "hsl(170 85% 35%)" }} />
        <h2 className="text-5xl font-bold">Literature <span style={{ color: "hsl(170 85% 35%)" }}>Review</span></h2>
      </motion.div>
      <p className="text-base mb-5" style={{ color: "#666" }}>Systematic analysis of peer-reviewed research identifying gaps in existing P2P file transfer solutions</p>

      <div className="flex-1 flex flex-col gap-3">
        {papers.map((p, i) => (
          <motion.div key={p.id} className="flex gap-5 p-4 rounded-xl" style={{ background: "#f8f9fa", borderLeft: `4px solid ${p.color}`, border: `1px solid hsl(220 15% 88%)`, borderLeftWidth: "4px", borderLeftColor: p.color }}
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}>
            <div className="flex flex-col items-center justify-center flex-shrink-0 w-10">
              <span className="text-2xl font-black" style={{ color: `${p.color}88` }}>[{p.id}]</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-base font-bold" style={{ color: p.color }}>{p.authors} ({p.year})</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${p.color}12`, color: p.color, border: `1px solid ${p.color}30` }}>{p.source}</span>
              </div>
              <p className="text-sm font-semibold mb-1.5" style={{ color: "#333" }}>"{p.title}"</p>
              <div className="flex gap-6">
                <div className="flex items-start gap-2 flex-1">
                  <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "hsl(145 70% 35%)" }} />
                  <p className="text-xs" style={{ color: "#555" }}>{p.finding}</p>
                </div>
                <div className="flex items-start gap-2 flex-1">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: "hsl(40 90% 40%)" }} />
                  <p className="text-xs" style={{ color: "#666" }}>{p.gap}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div className="p-4 rounded-xl mt-4" style={{ background: "hsl(170 85% 35% / 0.06)", border: "1px solid hsl(170 85% 35% / 0.2)" }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <p className="text-sm leading-relaxed" style={{ color: "#555" }}>
          <span className="font-bold text-base" style={{ color: "hsl(170 85% 35%)" }}>⚡ Research Gap Synthesis: </span>
          No existing work simultaneously achieves <span style={{ color: "hsl(200 80% 40%)" }}>zero-configuration discovery</span>,
          <span style={{ color: "hsl(170 85% 35%)" }}> cross-platform browser-only E2E encryption</span>, and
          <span style={{ color: "hsl(145 70% 35%)" }}> offline-first operation</span> on open web standards.
        </p>
      </motion.div>
    </div>
  </SlideLayout>
);

export default LitReviewSlide;

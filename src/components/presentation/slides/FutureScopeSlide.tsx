import SlideLayout from "../SlideLayout";
import { motion } from "framer-motion";
import { Microscope, Globe, Brain, Layers, Fingerprint } from "lucide-react";

const futureWork = [
  { icon: Layers, title: "Multi-Hop Relay Transfer", desc: "Extend range beyond single LAN using relay nodes with onion-style encryption layers.", tags: ["Overlay Networks", "Routing"], color: "hsl(170 85% 35%)" },
  { icon: Fingerprint, title: "Zero-Knowledge Authentication", desc: "ZK-SNARK based device verification to authenticate peers without revealing identity.", tags: ["ZK Proofs", "Privacy"], color: "hsl(200 80% 40%)" },
  { icon: Brain, title: "Adaptive Chunk Optimization", desc: "ML-based dynamic chunk sizing adapting to real-time network conditions.", tags: ["Machine Learning", "QoS"], color: "hsl(40 90% 40%)" },
  { icon: Globe, title: "Progressive Web App (PWA)", desc: "Offline-first PWA with service workers for instant loading and native-like UX.", tags: ["Service Workers", "Installable"], color: "hsl(145 70% 35%)" },
  { icon: Microscope, title: "Formal Security Verification", desc: "ProVerif/Tamarin model checking to formally verify the cryptographic protocol.", tags: ["Formal Methods", "Analysis"], color: "hsl(280 70% 45%)" },
];

const FutureScopeSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <motion.h2 className="text-5xl font-bold mb-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        Future <span style={{ color: "hsl(170 85% 35%)" }}>Scope</span>
      </motion.h2>
      <p className="text-lg mb-10" style={{ color: "#666" }}>Research Directions & Potential Extensions</p>

      <div className="flex-1 flex flex-col gap-5">
        {futureWork.map((item, i) => (
          <motion.div key={i} className="flex items-start gap-6 p-6 rounded-xl" style={{ background: "#f8f9fa", border: `1px solid ${item.color}20` }}
            initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}>
            <div className="p-4 rounded-xl flex-shrink-0" style={{ background: `${item.color}10`, border: `1px solid ${item.color}25` }}>
              <item.icon size={32} style={{ color: item.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1" style={{ color: item.color }}>{item.title}</h3>
              <p className="text-base leading-relaxed mb-3" style={{ color: "#555" }}>{item.desc}</p>
              <div className="flex gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded text-xs font-medium" style={{ background: `${item.color}08`, color: item.color, border: `1px solid ${item.color}20` }}>{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </SlideLayout>
);

export default FutureScopeSlide;

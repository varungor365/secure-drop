import SlideLayout from "../SlideLayout";
import { motion } from "framer-motion";
import p2pImage from "@/assets/p2p-architecture.png";

const ArchitectureSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <motion.h2
        className="text-5xl font-bold mb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        System <span style={{ color: "hsl(170 85% 35%)" }}>Architecture</span>
      </motion.h2>
      <p className="text-lg mb-6" style={{ color: "#666" }}>
        Peer-to-Peer (P2P) Network Topology — Decentralized, Zero-Server Model
      </p>

      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{ border: "2px solid hsl(220 15% 85%)", background: "#fff" }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img
            src={p2pImage}
            alt="Peer-to-Peer Architecture - Unstructured and Structured Networks"
            className="w-auto object-contain"
            style={{ maxHeight: "680px" }}
          />
        </motion.div>
      </div>

      {/* Academic footnote */}
      <p className="text-sm mt-4 italic" style={{ color: "#999" }}>
        Ref: Lua et al. (2005), "A survey and comparison of peer-to-peer overlay network schemes," IEEE Communications Surveys & Tutorials
      </p>
    </div>
  </SlideLayout>
);

export default ArchitectureSlide;

import SlideLayout from "../SlideLayout";
import { motion } from "framer-motion";
import { FileInput, FileOutput } from "lucide-react";

const ProjectDescriptionSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <motion.h2
        className="text-5xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Project <span style={{ color: "hsl(170 85% 35%)" }}>Description</span>
      </motion.h2>
      <p className="text-lg mb-8" style={{ color: "#666" }}>
        Input / Output Scheme — Demonstrating the data flow through Secure-Drop
      </p>

      <div className="flex-1 flex gap-10">
        {/* Input Section */}
        <motion.div
          className="flex-1 flex flex-col rounded-2xl p-8"
          style={{ background: "hsl(200 80% 45% / 0.06)", border: "1px solid hsl(200 80% 45% / 0.25)" }}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-xl" style={{ background: "hsl(200 80% 45% / 0.1)", border: "1px solid hsl(200 80% 45% / 0.3)" }}>
              <FileInput size={36} style={{ color: "hsl(200 80% 45%)" }} />
            </div>
            <h3 className="text-3xl font-bold" style={{ color: "hsl(200 80% 40%)" }}>Input</h3>
          </div>

          <div className="flex-1 rounded-xl p-6" style={{ background: "#f8f9fa", border: "2px dashed hsl(220 15% 80%)", minHeight: "300px" }}>
            <p className="text-base font-medium mb-4" style={{ color: "#888" }}>Dataset / Input Sample:</p>
            {/* Placeholder for actual data entry */}
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>File Selected</p>
                <p className="text-lg mt-1" style={{ color: "#333" }}>e.g., report.pdf (2.4 MB)</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>Sender Device</p>
                <p className="text-lg mt-1" style={{ color: "#333" }}>e.g., Laptop — Chrome 120</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>Receiver Device</p>
                <p className="text-lg mt-1" style={{ color: "#333" }}>e.g., Android — Firefox 121</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>Network</p>
                <p className="text-lg mt-1" style={{ color: "#333" }}>e.g., Wi-Fi 5GHz LAN</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Output Section */}
        <motion.div
          className="flex-1 flex flex-col rounded-2xl p-8"
          style={{ background: "hsl(145 70% 35% / 0.06)", border: "1px solid hsl(145 70% 35% / 0.25)" }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-xl" style={{ background: "hsl(145 70% 35% / 0.1)", border: "1px solid hsl(145 70% 35% / 0.3)" }}>
              <FileOutput size={36} style={{ color: "hsl(145 70% 35%)" }} />
            </div>
            <h3 className="text-3xl font-bold" style={{ color: "hsl(145 70% 30%)" }}>Output</h3>
          </div>

          <div className="flex-1 rounded-xl p-6" style={{ background: "#f8f9fa", border: "2px dashed hsl(220 15% 80%)", minHeight: "300px" }}>
            <p className="text-base font-medium mb-4" style={{ color: "#888" }}>Result / Output Sample:</p>
            {/* Placeholder for actual output data */}
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>Transfer Status</p>
                <p className="text-lg mt-1 font-semibold" style={{ color: "hsl(145 70% 35%)" }}>✓ Completed Successfully</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>Transfer Speed</p>
                <p className="text-lg mt-1" style={{ color: "#333" }}>e.g., 42.5 MB/s</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>Encryption Overhead</p>
                <p className="text-lg mt-1" style={{ color: "#333" }}>e.g., 8.2% CPU</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#fff", border: "1px solid hsl(220 15% 88%)" }}>
                <p className="text-sm font-bold" style={{ color: "#999" }}>File Integrity</p>
                <p className="text-lg mt-1 font-semibold" style={{ color: "hsl(145 70% 35%)" }}>✓ SHA-256 Hash Verified</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </SlideLayout>
);

export default ProjectDescriptionSlide;

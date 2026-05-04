import SlideLayout from "../SlideLayout";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

const phases = [
  { phase: "Phase 1", activity: "Literature Survey & Requirement Analysis", schedule: "Aug – Sep 2024", status: "Completed", color: "hsl(145 70% 35%)" },
  { phase: "Phase 2", activity: "System Design & Architecture Planning", schedule: "Oct – Nov 2024", status: "Completed", color: "hsl(145 70% 35%)" },
  { phase: "Phase 3", activity: "Core Module Development (mDNS, WebSocket, WebRTC)", schedule: "Dec 2024 – Jan 2025", status: "Completed", color: "hsl(145 70% 35%)" },
  { phase: "Phase 4", activity: "AES-256-GCM Encryption Integration", schedule: "Feb 2025", status: "Completed", color: "hsl(145 70% 35%)" },
  { phase: "Phase 5", activity: "Cross-Platform Testing & Benchmarking", schedule: "Mar 2025", status: "In Progress", color: "hsl(40 90% 45%)" },
  { phase: "Phase 6", activity: "Documentation & Final Presentation", schedule: "Mar 2025", status: "In Progress", color: "hsl(40 90% 45%)" },
];

const statusBadge = (status: string, color: string) => (
  <span
    className="px-4 py-1.5 rounded-full text-sm font-bold"
    style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}
  >
    {status}
  </span>
);

const TimelineSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-8">
        <Calendar size={40} style={{ color: "hsl(170 85% 35%)" }} />
        <motion.h2
          className="text-5xl font-bold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Project <span style={{ color: "hsl(170 85% 35%)" }}>Timeline</span>
        </motion.h2>
      </div>

      <div className="flex-1">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(220 15% 85%)" }}>
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-0" style={{ background: "hsl(170 85% 35%)", color: "#fff" }}>
            <div className="p-5 text-xl font-bold border-r border-white/20">Phase</div>
            <div className="p-5 text-xl font-bold border-r border-white/20">Key Activity</div>
            <div className="p-5 text-xl font-bold border-r border-white/20">Schedule</div>
            <div className="p-5 text-xl font-bold">Current Status</div>
          </div>
          {/* Table Rows */}
          {phases.map((row, i) => (
            <motion.div
              key={i}
              className="grid grid-cols-4 gap-0"
              style={{
                background: i % 2 === 0 ? "#fafafa" : "#fff",
                borderTop: "1px solid hsl(220 15% 90%)",
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div className="p-5 text-lg font-bold border-r" style={{ color: "hsl(170 85% 30%)", borderColor: "hsl(220 15% 90%)" }}>
                {row.phase}
              </div>
              <div className="p-5 text-lg border-r" style={{ color: "#333", borderColor: "hsl(220 15% 90%)" }}>
                {row.activity}
              </div>
              <div className="p-5 text-lg border-r" style={{ color: "#555", borderColor: "hsl(220 15% 90%)" }}>
                {row.schedule}
              </div>
              <div className="p-5 flex items-center">
                {statusBadge(row.status, row.color)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </SlideLayout>
);

export default TimelineSlide;

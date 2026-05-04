import SlideLayout from "../SlideLayout";
import { Gauge, Cpu, Wifi, Battery } from "lucide-react";
import { motion } from "framer-motion";

const metrics = [
  { icon: Gauge, title: "Transfer Speed", value: "~120 MB/s", subtitle: "on 5GHz Wi-Fi", color: "hsl(170 85% 35%)", barWidth: "85%" },
  { icon: Wifi, title: "2.4GHz vs 5GHz", value: "3x faster", subtitle: "on 5GHz networks", color: "hsl(200 80% 40%)", barWidth: "70%" },
  { icon: Cpu, title: "Encryption Overhead", value: "<5% CPU", subtitle: "for 1GB file on laptop", color: "hsl(145 70% 35%)", barWidth: "15%" },
  { icon: Battery, title: "Mobile Impact", value: "Minimal", subtitle: "battery drain on mobile", color: "hsl(40 90% 40%)", barWidth: "10%" },
];

const cardVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.2, duration: 0.5, ease: [0, 0, 0.2, 1] as const } }),
};

const DataSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <motion.h2 className="text-5xl font-bold mb-6" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        Performance <span style={{ color: "hsl(170 85% 35%)" }}>Benchmarks</span>
      </motion.h2>
      <p className="text-xl mb-12" style={{ color: "#666" }}>Benchmarking against cloud uploads across different hardware and network conditions</p>

      <div className="flex-1 grid grid-cols-2 gap-8">
        {metrics.map((m, i) => (
          <motion.div key={i} className="flex flex-col gap-4 p-10 rounded-2xl" style={{ background: "#f8f9fa", border: `1px solid ${m.color}30` }}
            custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="flex items-center gap-8">
              <div className="p-6 rounded-2xl" style={{ background: `${m.color}12`, border: `1px solid ${m.color}30` }}>
                <m.icon size={48} style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-lg font-medium mb-1" style={{ color: "#666" }}>{m.title}</p>
                <motion.p className="text-4xl font-black" style={{ color: m.color }}
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.2 + 0.3, duration: 0.4, type: "spring" }}>
                  {m.value}
                </motion.p>
                <p className="text-base mt-1" style={{ color: "#666" }}>{m.subtitle}</p>
              </div>
            </div>
            <div className="w-full h-3 rounded-full" style={{ background: `${m.color}12` }}>
              <motion.div className="h-full rounded-full" style={{ background: m.color }}
                initial={{ width: 0 }} animate={{ width: m.barWidth }} transition={{ delay: i * 0.2 + 0.5, duration: 0.8, ease: "easeOut" }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </SlideLayout>
);

export default DataSlide;

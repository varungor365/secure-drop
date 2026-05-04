import SlideLayout from "../SlideLayout";
import { Code2, Server, Video, ShieldCheck } from "lucide-react";

const tools = [
  { category: "Frontend", icon: Code2, items: ["React.js", "HTML5", "Drag & Drop UI"], color: "hsl(200 80% 40%)", desc: "Clean, responsive interface with rapid prototyping via Lovable" },
  { category: "Backend / Signaling", icon: Server, items: ["Python", "WebSockets", "mDNS"], color: "hsl(145 70% 35%)", desc: "Device discovery and signaling for connection setup" },
  { category: "Data Transfer", icon: Video, items: ["WebRTC", "STUN/TURN", "Chunked Transfer"], color: "hsl(40 90% 40%)", desc: "Direct peer-to-peer data channels for maximum throughput" },
  { category: "Security", icon: ShieldCheck, items: ["Web Crypto API", "AES-256-GCM", "Client-side"], color: "hsl(170 85% 35%)", desc: "Encryption handled entirely on the client — keys never leave the device" },
];

const ToolsSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <h2 className="text-5xl font-bold mb-14">Technology <span style={{ color: "hsl(170 85% 35%)" }}>Stack</span></h2>
      <div className="flex-1 grid grid-cols-2 gap-8">
        {tools.map((tool, i) => (
          <div key={i} className="flex gap-6 p-8 rounded-2xl" style={{ background: "#f8f9fa", border: `1px solid ${tool.color}30` }}>
            <div className="p-5 rounded-xl h-fit" style={{ background: `${tool.color}12`, border: `1px solid ${tool.color}30` }}>
              <tool.icon size={40} style={{ color: tool.color }} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ color: tool.color }}>{tool.category}</h3>
              <p className="text-base mb-4" style={{ color: "#555" }}>{tool.desc}</p>
              <div className="flex flex-wrap gap-3">
                {tool.items.map((item) => (
                  <span key={item} className="px-4 py-2 rounded-lg text-base font-medium" style={{ background: `${tool.color}10`, color: tool.color, border: `1px solid ${tool.color}25` }}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </SlideLayout>
);

export default ToolsSlide;

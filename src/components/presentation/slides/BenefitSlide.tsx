import SlideLayout from "../SlideLayout";
import { GraduationCap, Building2, Mountain } from "lucide-react";

const cases = [
  { icon: GraduationCap, title: "University Campuses", desc: "Save massive bandwidth. Students share project files, presentations, and datasets instantly without stressing the network.", color: "hsl(170 85% 35%)" },
  { icon: Building2, title: "Corporate & Legal Offices", desc: "Ensures 'Data Sovereignty' — sensitive legal documents and corporate IP never touch third-party cloud servers.", color: "hsl(200 80% 40%)" },
  { icon: Mountain, title: "Disaster Zones & Remote Areas", desc: "Crucial communication tool where internet is down but local network routing still functions.", color: "hsl(145 70% 35%)" },
];

const BenefitSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <h2 className="text-5xl font-bold mb-14">Benefit for <span style={{ color: "hsl(170 85% 35%)" }}>Society</span></h2>
      <div className="flex-1 flex gap-10">
        {cases.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col p-10 rounded-2xl" style={{ background: "#f8f9fa", border: `1px solid ${c.color}30` }}>
            <div className="p-6 rounded-2xl mb-8 w-fit" style={{ background: `${c.color}10`, border: `1px solid ${c.color}30` }}>
              <c.icon size={52} style={{ color: c.color }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: c.color }}>{c.title}</h3>
            <p className="text-lg leading-relaxed flex-1" style={{ color: "#555" }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideLayout>
);

export default BenefitSlide;

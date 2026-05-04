import SlideLayout from "../SlideLayout";
import { BookOpen, Target, Search, Cog, Wrench, BarChart3, CheckCircle, Heart, FileText, List, Network, ShieldCheck, Microscope, Calendar, ClipboardList } from "lucide-react";

const items = [
  { num: "01", title: "Introduction & Problem Statement", icon: BookOpen },
  { num: "02", title: "Research Objectives", icon: Target },
  { num: "03", title: "Literature Review", icon: Search },
  { num: "04", title: "System Architecture", icon: Network },
  { num: "05", title: "Methodology & Protocol", icon: Cog },
  { num: "06", title: "Security Analysis", icon: ShieldCheck },
  { num: "07", title: "Technology Stack", icon: Wrench },
  { num: "08", title: "Project Description", icon: ClipboardList },
  { num: "09", title: "Project Timeline", icon: Calendar },
  { num: "10", title: "Experimental Results", icon: BarChart3 },
  { num: "11", title: "Conclusion", icon: CheckCircle },
  { num: "12", title: "Future Scope", icon: Microscope },
  { num: "13", title: "Societal Impact", icon: Heart },
  { num: "14", title: "References", icon: FileText },
];

const IndexSlide = () => (
  <SlideLayout>
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-10">
        <List size={40} style={{ color: "hsl(170 85% 35%)" }} />
        <h2 className="text-5xl font-bold">Agenda</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 content-start">
        {items.map((item) => (
          <div
            key={item.num}
            className="flex items-center gap-4 p-5 rounded-xl"
            style={{
              background: "#f8f9fa",
              border: "1px solid hsl(220 15% 88%)",
            }}
          >
            <span className="text-2xl font-black" style={{ color: "hsl(170 85% 35% / 0.5)" }}>
              {item.num}
            </span>
            <item.icon size={24} style={{ color: "hsl(170 85% 35%)" }} />
            <span className="text-lg font-medium" style={{ color: "#333" }}>{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  </SlideLayout>
);

export default IndexSlide;

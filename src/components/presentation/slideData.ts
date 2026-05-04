import TitleSlide from "./slides/TitleSlide";
import IndexSlide from "./slides/IndexSlide";
import IntroSlide from "./slides/IntroSlide";
import ObjectivesSlide from "./slides/ObjectivesSlide";
import LitReviewSlide from "./slides/LitReviewSlide";
import ArchitectureSlide from "./slides/ArchitectureSlide";
import MethodologySlide from "./slides/MethodologySlide";
import SecurityAnalysisSlide from "./slides/SecurityAnalysisSlide";
import ToolsSlide from "./slides/ToolsSlide";
import ProjectDescriptionSlide from "./slides/ProjectDescriptionSlide";
import TimelineSlide from "./slides/TimelineSlide";
import DataSlide from "./slides/DataSlide";
import ConclusionSlide from "./slides/ConclusionSlide";
import FutureScopeSlide from "./slides/FutureScopeSlide";
import BenefitSlide from "./slides/BenefitSlide";
import ReferencesSlide from "./slides/ReferencesSlide";

export interface SlideData {
  component: React.FC;
  title: string;
  speaker: string;
  notes: string;
}

export const slides: SlideData[] = [
  {
    component: TitleSlide,
    title: "Title",
    speaker: "Varun",
    notes: `"Good morning, Dr. Gupta and esteemed faculty. My name is Varun Ruhella, and I am joined by my teammates, Aaditya Singh and Anushka Walia. Today, we are presenting our capstone project: Secure-Drop — a decentralized, offline, end-to-end encrypted peer-to-peer file transfer system."`,
  },
  {
    component: IndexSlide,
    title: "Index",
    speaker: "Varun",
    notes: `"Our presentation follows a structured academic format covering all key sections."`,
  },
  {
    component: IntroSlide,
    title: "Introduction & Problem Statement",
    speaker: "Varun",
    notes: `"The problem we address is rooted in a fundamental inefficiency: two devices on the same local network must route data through geographically distant cloud servers."`,
  },
  {
    component: ObjectivesSlide,
    title: "Research Objectives",
    speaker: "Varun",
    notes: `"Our research objectives are formally defined as: Zero internet dependency, AES-256-GCM encryption, and universal cross-platform compatibility."`,
  },
  {
    component: LitReviewSlide,
    title: "Literature Review",
    speaker: "Aaditya",
    notes: `"Our literature review draws from five key sources covering secure device-to-device protocols, WebRTC-based decentralized file sharing, and threat models."`,
  },
  {
    component: ArchitectureSlide,
    title: "System Architecture",
    speaker: "Aaditya",
    notes: `"Our architecture follows a decentralized P2P topology as classified by Lua et al. (2005), showing both unstructured and structured network models."`,
  },
  {
    component: MethodologySlide,
    title: "Methodology & Protocol Design",
    speaker: "Aaditya",
    notes: `"Our four-phase protocol: Discovery via mDNS, Signaling via WebSocket, Encryption via AES-256-GCM, and Transfer via WebRTC DataChannels."`,
  },
  {
    component: SecurityAnalysisSlide,
    title: "Security Analysis",
    speaker: "Anushka",
    notes: `"Our cryptographic design addresses the threat models identified by Salihu et al. (2019) in their WebRTC security analysis."`,
  },
  {
    component: ToolsSlide,
    title: "Technology Stack",
    speaker: "Anushka",
    notes: `"Our stack: React.js frontend, Python backend signaling, WebRTC DataChannel API, and W3C Web Crypto API for AES-256-GCM."`,
  },
  {
    component: ProjectDescriptionSlide,
    title: "Project Description",
    speaker: "Anushka",
    notes: `"This slide shows the input/output scheme of Secure-Drop — demonstrating the actual data flow from file selection to verified delivery."`,
  },
  {
    component: TimelineSlide,
    title: "Project Timeline",
    speaker: "Anushka",
    notes: `"Our project followed a six-phase timeline from literature survey through to final documentation and presentation."`,
  },
  {
    component: DataSlide,
    title: "Experimental Results",
    speaker: "Anushka",
    notes: `"Our benchmarks show 45 MB/s on 5GHz with only 8-15% encryption overhead."`,
  },
  {
    component: ConclusionSlide,
    title: "Conclusion",
    speaker: "Varun",
    notes: `"Our research demonstrates enterprise-grade secure file transfer without centralized infrastructure."`,
  },
  {
    component: FutureScopeSlide,
    title: "Future Scope",
    speaker: "Anushka",
    notes: `"Future directions include Multi-Hop Relay, Zero-Knowledge Authentication, ML-based Adaptive Chunk Optimization, and PWA deployment."`,
  },
  {
    component: BenefitSlide,
    title: "Societal Impact",
    speaker: "Anushka",
    notes: `"Secure-Drop ensures files never leave the organizational network — addressing data sovereignty concerns."`,
  },
  {
    component: ReferencesSlide,
    title: "References",
    speaker: "Varun",
    notes: `"Our references include five peer-reviewed papers and core IETF RFCs. Thank you, Dr. Gupta. We are open to questions."`,
  },
];

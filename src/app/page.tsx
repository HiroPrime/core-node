"use client";
import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, X, Shield, Target, Zap, Network, Radio, Mail, BookOpen, Share2, Users, Database, Cpu } from "lucide-react";

// MANUAL SVG COMPONENT: Bypasses library versioning errors entirely
const LinkedInIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function CoreNodeJourney() {
  const [stage, setStage] = useState(0);
  const [showCredo, setShowCredo] = useState(false);
  const [showArchitect, setShowArchitect] = useState(false);
  const [showLibrarian, setShowLibrarian] = useState(false);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // PERSISTENCE HANDSHAKE
  useEffect(() => {
    setIsMounted(true);
    try {
      const hasCompletedIntro = window.localStorage.getItem('nexus_intro_complete');
      if (hasCompletedIntro === 'true') {
        setStage(4);
      }
    } catch (error) {
      console.warn("Incognito mode detected: Local storage access denied. Proceeding without persistence.");
    }
  }, []);

  const completeIntro = () => {
    try {
      window.localStorage.setItem('nexus_intro_complete', 'true');
    } catch (error) {}
    setStage(4);
    window.scrollTo(0, 0);
  };

  const resetIntro = () => {
    try {
      window.localStorage.removeItem('nexus_intro_complete');
    } catch (error) {}
    setStage(1);
    window.scrollTo(0, 0);
  };

  const nodeRegistry = useMemo(() => [
    {
      id: 0,
      name: "Prime Portal",
      status: "ACTIVE",
      details: "Our flagship node. A high-performance analytics platform built for the competitive TCG community. Bridges complex game metadata with real-time market action.",
      link: "https://primeportal.nexus",
      color: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.5)"
    },
    {
      id: 1,
      name: "Grimm Fracture",
      status: "DEPLOYING",
      details: "The creative node. A dark fantasy digital IP pushing the boundaries of what AI-driven visual storytelling can achieve.",
      link: "https://grimmfracture.nexus",
      color: "#ef4444",
      glow: "rgba(239, 68, 68, 0.5)"
    },
    {
      id: 2,
      name: "VOID",
      status: "SEARCHING",
      details: "Reserved sector for future deployment of gaming, AI, or digital storytelling tools. Experience Points required to unlock.",
      link: "#",
      color: "#dfd21b",
      glow: "rgba(223, 210, 27, 0.3)"
    }
  ], []);

  const activeNode = nodeRegistry[activeNodeIndex];

  if (!isMounted) return <div className="bg-[#030303] h-screen w-screen flex items-center justify-center" />;

  return (
    <main className="bg-[#030303] min-h-screen w-screen text-white font-sans overflow-x-hidden selection:bg-[#FF5F1F] selection:text-white">

      {/* ========================================== */}
      {/* HEADER & NAVIGATION */}
      {/* ========================================== */}
      <header className="fixed top-0 left-0 w-full z-[200] pointer-events-none h-24">
        <div className="relative w-full h-full max-w-[1400px] mx-auto">
          
          <div 
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ease-out pointer-events-auto"
            style={{
              top: stage === 0 ? '50vh' : '24px',
              marginTop: stage === 0 ? '-32px' : '0',
            }}
          >
            <div 
              onClick={() => stage === 0 && setStage(1)}
              className={`core-node-pulse bg-white rounded-full transition-all duration-1000 shadow-[inset_-4px_-4px_12px_rgba(0,0,0,0.5)] ${stage === 4 ? 'w-6 h-6 md:w-8 md:h-8' : 'w-16 h-16 md:w-20 md:h-20'} ${stage === 0 ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
            />
            <h1 className={`font-black tracking-[0.4em] mt-3 transition-all duration-1000 ${stage === 0 ? 'opacity-0' : 'opacity-100'} ${stage === 4 ? 'text-base md:text-xl' : 'text-3xl md:text-5xl'}`}>
              NEXUS
            </h1>
          </div>

          {/* RESPONSIVE NAV MENU */}
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 md:absolute md:bottom-auto md:left-auto md:translate-x-0 md:top-10 md:right-10 flex items-center gap-6 md:gap-8 bg-[#1a1a1a]/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none px-8 py-5 md:p-0 rounded-full md:rounded-none border border-[#444] md:border-none shadow-2xl md:shadow-none transition-opacity duration-1000 pointer-events-auto z-[250] ${stage === 4 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div role="button" onClick={() => setShowCredo(true)} className="cursor-pointer text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors">Credo</div>
            <div role="button" onClick={() => setShowArchitect(true)} className="cursor-pointer text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors">Architect</div>
            <div role="button" onClick={() => setShowLibrarian(true)} className="cursor-pointer text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors">Librarian</div>
          </div>

        </div>
      </header>

      {/* ========================================== */}
      {/* STORY STAGES (1-3) */}
      {/* ========================================== */}
      {stage > 0 && stage < 4 && (
        <div className="min-h-screen flex flex-col justify-center items-center px-6 pt-32 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-700 max-w-4xl text-center w-full">
            
            {stage === 1 && (
              <>
                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-tight tracking-tight text-white">
                  The internet is vast, but we are connecting the dots. Every network starts with a single point. <span className="text-[#FF5F1F]">Welcome to Core Node.</span>
                </p>
                <div className="mt-12 md:mt-16">
                  <div role="button" onClick={() => setStage(2)} className="inline-flex items-center justify-center cursor-pointer bg-white text-black border-2 border-white px-10 py-5 md:px-16 md:py-6 rounded-full text-lg md:text-xl font-black uppercase tracking-widest shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all">
                    Welcome to the Nexus
                  </div>
                </div>
              </>
            )}

            {stage === 2 && (
              <>
                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-tight tracking-tight text-white">
                  Nexus is a digital foundry. We don't just build isolated apps. <span className="text-[#FF5F1F]">We build Nodes.</span>
                </p>
                <div className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                  <div role="button" onClick={() => setStage(1)} className="inline-flex items-center justify-center cursor-pointer bg-[#1a1a1a] border-2 border-[#444] text-white px-10 py-5 md:px-12 md:py-6 rounded-full text-lg md:text-xl font-black uppercase tracking-widest hover:bg-[#222] transition-colors w-full sm:w-auto">
                    Back
                  </div>
                  <div role="button" onClick={() => setStage(3)} className="inline-flex items-center justify-center cursor-pointer bg-white text-black border-2 border-white px-10 py-5 md:px-16 md:py-6 rounded-full text-lg md:text-xl font-black uppercase tracking-widest shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all w-full sm:w-auto">
                    What do you actually do?
                  </div>
                </div>
              </>
            )}

            {stage === 3 && (
              <>
                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-tight tracking-tight text-white">
                  One node succeeds, it powers the next. Expanding our web of <span className="text-[#FF5F1F]">gaming, AI, and storytelling.</span>
                </p>
                <div className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                  <div role="button" onClick={() => setStage(2)} className="inline-flex items-center justify-center cursor-pointer bg-[#1a1a1a] border-2 border-[#444] text-white px-10 py-5 md:px-12 md:py-6 rounded-full text-lg md:text-xl font-black uppercase tracking-widest hover:bg-[#222] transition-colors w-full sm:w-auto">
                    Back
                  </div>
                  <div role="button" onClick={completeIntro} className="inline-flex items-center justify-center cursor-pointer bg-[#FF5F1F] text-white border-2 border-[#FF5F1F] px-10 py-5 md:px-16 md:py-6 rounded-full text-lg md:text-xl font-black uppercase tracking-widest shadow-[0_0_50px_rgba(255,95,31,0.3)] hover:scale-105 transition-all w-full sm:w-auto">
                    Initialize System
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* STAGE 4: THE DASHBOARD */}
      {/* ========================================== */}
      {stage === 4 && (
        <div className="animate-in fade-in duration-1000 pt-32 md:pt-40 pb-32">
          <div className="max-w-6xl mx-auto text-center px-6">
            
            <h2 className="text-6xl sm:text-7xl md:text-[8rem] lg:text-[10rem] font-black tracking-tighter mt-8 md:mt-16 mb-6 md:mb-10 leading-none">
              SEASON 1.
            </h2>
            
            <div className="max-w-2xl mx-auto mb-20 md:mb-32 text-lg md:text-xl text-gray-400 leading-relaxed font-semibold px-2">
              Establish the Core Node, power up flagship products, and earn experience points. Supporting nodes feeds energy back into the Core, unlocking new skills.
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-12 md:mb-20 tracking-tight">
              EXPLORE THE NODES
            </h2>

            {/* NODE CAROUSEL */}
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 mb-20 md:mb-32">
              {nodeRegistry.map((node, i) => (
                <div 
                  key={node.id} 
                  onClick={() => setActiveNodeIndex(i)} 
                  className={`w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 ease-out p-4 text-center border-4 ${
                    activeNodeIndex === i 
                      ? 'scale-110 bg-[#080808]' 
                      : 'scale-100 bg-[#151515] border-[#333333] hover:border-[#555555] hover:bg-[#1a1a1a] opacity-100'
                  }`}
                  style={{
                    borderColor: activeNodeIndex === i ? node.color : undefined,
                    boxShadow: activeNodeIndex === i ? `0 0 60px ${node.glow}` : 'none',
                  }}
                >
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest leading-tight ${activeNodeIndex === i ? 'text-white' : 'text-gray-300'}`}>
                    {activeNodeIndex === i ? (node.name === "Grimm Fracture" ? "Connecting Node" : node.name === "VOID" ? "Discovery Node" : "Active Connection") : node.name}
                  </span>
                </div>
              ))}
            </div>

            {/* NODE DETAILS CARD */}
            <div className="bg-[#070707] border border-[#1a1a1a] p-8 sm:p-12 md:p-16 rounded-[2.5rem] md:rounded-[4rem] text-left max-w-4xl mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)] md:shadow-[0_50px_120px_rgba(0,0,0,0.6)]">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
                 <h3 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight m-0 leading-none">{activeNode.name}</h3>
                 <span className="text-[10px] md:text-xs font-black uppercase px-4 py-2 rounded-full tracking-widest shrink-0" style={{ color: activeNode.color, border: `1px solid ${activeNode.color}` }}>
                   {activeNode.status}
                 </span>
               </div>
               <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-12 md:mb-16 font-medium">
                 {activeNode.details}
               </p>
               {activeNode.link !== "#" && (
                 <a href={activeNode.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-3 bg-white text-black border-2 border-white px-8 py-4 md:px-12 md:py-5 rounded-full font-black text-sm md:text-base uppercase tracking-widest hover:bg-[#FF5F1F] hover:border-[#FF5F1F] hover:text-white transition-colors w-full sm:w-auto text-center">
                   INITIALIZE UPLINK <ExternalLink size={18} />
                 </a>
               )}
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      {stage === 4 && (
        <footer className="max-w-6xl mx-auto px-6 py-12 md:py-20 border-t border-[#1a1a1a] flex flex-col md:flex-row justify-between items-center gap-6 text-gray-500 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase mb-20 md:mb-0">
          <div role="button" onClick={resetIntro} className="cursor-pointer inline-block hover:text-white transition-colors">View Opening</div>
          <span className="text-center">NEXUS // SEASON 1 // 2026</span>
          <div className="hidden md:block w-32"></div>
        </footer>
      )}

      {/* ========================================== */}
      {/* MODAL: CREDO */}
      {/* ========================================== */}
      {showCredo && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center backdrop-blur-xl p-4 sm:p-6">
          <div className="bg-[#050505] border border-[#1a1a1a] w-full max-w-4xl max-h-[90vh] rounded-[2rem] sm:rounded-[3rem] relative overflow-y-auto p-8 sm:p-12 md:p-16">
            <div role="button" onClick={() => setShowCredo(false)} className="sticky top-0 float-right cursor-pointer text-gray-500 hover:text-white z-50 bg-black/50 md:bg-transparent backdrop-blur-md md:backdrop-blur-none rounded-full p-2 -mr-4 -mt-4 sm:-mr-8 sm:-mt-8">
              <X size={32} />
            </div>
            <div className="mt-4 md:mt-0">
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-black mb-2 tracking-tight">CREDO.</h2>
              <p className="text-[#FF5F1F] font-black tracking-widest text-xs md:text-sm mb-12 md:mb-16 uppercase">CORE NODE PRINCIPLES</p>
            </div>
            
            <div className="text-base md:text-lg text-gray-400 leading-relaxed font-medium">
              <p className="text-xl md:text-2xl text-white font-bold mb-10">The Nexus Credo: Core Node Principles</p>
              <p className="mb-12">At Nexus, our mission is to ignite the future of play and utility by building an interconnected web of digital nodes, fueled by AI and driven by data storytelling. This is the code we live by as we build the constellation:</p>
              
              <div className="mb-12">
                <h4 className="text-white text-2xl md:text-3xl font-black mb-4 flex items-start sm:items-center"><Shield className="w-6 h-6 md:w-8 md:h-8 text-[#FF5F1F] mr-3 shrink-0 mt-1 sm:mt-0" /> I. Architecture Over Ambiguity</h4>
                <p>We don’t just generate ideas; we architect the logic. Every node in the Nexus is built on a rock-solid foundation of enterprise-grade data architecture. Whether we are engineering automated SQL extraction pipelines or designing a scalable Star Schema for a TCG engine, we build for performance, fidelity, and scale.</p>
                <p className="mt-4 text-[#FF5F1F] font-extrabold text-xs md:text-sm uppercase tracking-wider">The Standard: 99.8% data fidelity isn't just for inventory; it’s the benchmark for every digital world we create.</p>
              </div>

              <div className="mb-12">
                <h4 className="text-white text-2xl md:text-3xl font-black mb-4 flex items-start sm:items-center"><Target className="w-6 h-6 md:w-8 md:h-8 text-[#FF5F1F] mr-3 shrink-0 mt-1 sm:mt-0" /> II. Storytelling is the Ultimate Data Filter</h4>
                <p>Complex data is a dark forest; our job is to light the path. We specialize in translating massive, disparate datasets into compelling, actionable stories for the user. We believe that whether you are an executive looking at a Power BI dashboard or a gamer navigating a sphere grid, the experience should be intuitive, visual, and user-centric.</p>
                <p className="mt-4 text-[#FF5F1F] font-extrabold text-xs md:text-sm uppercase tracking-wider">The Standard: Turn "massive and disparate" metadata into premium, high-performance digital experiences.</p>
              </div>

              <div className="mb-12">
                <h4 className="text-white text-2xl md:text-3xl font-black mb-4 flex items-start sm:items-center"><Zap className="w-6 h-6 md:w-8 md:h-8 text-[#FF5F1F] mr-3 shrink-0 mt-1 sm:mt-0" /> III. The AI Force Multiplier</h4>
                <p>We embrace the "virtual studio" model. We leverage Generative AI not as a shortcut, but as a force multiplier to innovate at speeds previously impossible for a solo builder. By orchestrating a suite of advanced AI tools, we redefine how rapidly high-quality visual IP and cohesive technical architectures can be scaled.</p>
                <p className="mt-4 text-[#FF5F1F] font-extrabold text-xs md:text-sm uppercase tracking-wider">The Standard: Move from initial brainstorming to final publication and deployment with the precision of an enterprise operations specialist.</p>
              </div>

              <div className="mb-12">
                <h4 className="text-white text-2xl md:text-3xl font-black mb-4 flex items-start sm:items-center"><Network className="w-6 h-6 md:w-8 md:h-8 text-[#FF5F1F] mr-3 shrink-0 mt-1 sm:mt-0" /> IV. Connections Build Constellations</h4>
                <p>No node exists in isolation. Our philosophy is rooted in the "interconnected web"—the belief that every product should power and inform the next. We bring a decade of experience in cross-functional leadership and project execution to ensure that every "season" of development adds a new, vibrant node to the Nexus.</p>
                <p className="mt-4 text-[#FF5F1F] font-extrabold text-xs md:text-sm uppercase tracking-wider">The Standard: Bridge the gap between technical rigor (M.A. in Game Development) and creative vision (Professional Design).</p>
              </div>

              <div className="mb-16">
                <h4 className="text-white text-2xl md:text-3xl font-black mb-4 flex items-start sm:items-center"><Radio className="w-6 h-6 md:w-8 md:h-8 text-[#FF5F1F] mr-3 shrink-0 mt-1 sm:mt-0" /> V. Build in Public, Level Up in Person</h4>
                <p>We are down-to-earth builders. We value the impact of the community and the experience points earned through real-world trial and error. We believe in a culture of data-driven workflows where we constantly level up our skills to become better builders for the future of play.</p>
                <p className="mt-4 text-[#FF5F1F] font-extrabold text-xs md:text-sm uppercase tracking-wider">The Standard: Leadership isn't just about the work we've done; it's about the work we are now empowered to do.</p>
              </div>

              <div className="border-t border-[#1a1a1a] pt-8 md:pt-10">
                <h5 className="text-white font-black text-xs md:text-sm tracking-widest uppercase mb-6">Current Season: Node Quest</h5>
                <p className="text-sm md:text-base font-black my-2">Core Node Active: <span className="text-[#FF5F1F]">corenode.nexus</span></p>
                <p className="text-sm md:text-base font-black my-2">Primary Node Powering: <span className="text-[#3b82f6]">primeportal.nexus</span></p>
                <p className="text-sm md:text-base font-black my-2">Secondary Node Awakening: <span className="text-[#ef4444]">grimmfracture.nexus</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: THE ARCHITECT (JACOB) */}
      {/* ========================================== */}
      {showArchitect && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center backdrop-blur-xl p-4 sm:p-6">
          <div className="bg-[#050505] border border-[#1a1a1a] w-full max-w-4xl max-h-[90vh] rounded-[2rem] sm:rounded-[3rem] relative overflow-y-auto p-8 sm:p-12 md:p-16">
            <div role="button" onClick={() => setShowArchitect(false)} className="sticky top-0 float-right cursor-pointer text-gray-500 hover:text-white z-50 bg-black/50 md:bg-transparent backdrop-blur-md md:backdrop-blur-none rounded-full p-2 -mr-4 -mt-4 sm:-mr-8 sm:-mt-8">
              <X size={32} />
            </div>
            
            <div className="w-full h-[250px] sm:h-[350px] md:h-[450px] bg-[#0a0a0a] rounded-[1.5rem] md:rounded-[2rem] mb-8 md:mb-12 overflow-hidden border border-[#1a1a1a] mt-4 md:mt-0">
               <img src="/Jacob_Profile.png" alt="Jacob Lovell - The Architect" className="w-full h-full object-cover object-mid" />
            </div>

            <h2 className="text-5xl sm:text-6xl md:text-7xl font-black mb-2 tracking-tight uppercase">THE ARCHITECT</h2>
            <p className="text-[#FF5F1F] font-black tracking-widest text-xs md:text-sm mb-8 md:mb-12 uppercase">JACOB LOVELL // FOUNDER & SOLO DEVELOPER</p>
            
            <div className="text-base md:text-lg text-gray-400 leading-relaxed font-medium mb-10 md:mb-12">
              <p>Every digital constellation requires a strong foundation. The Architect provides the structural integrity of the Nexus.</p>
              <p className="mt-4 md:mt-6">A builder, gamer, and creative technologist, Jacob believes the best products are forged by those willing to get their hands dirty. He holds a Master's in Game Development, backed by a decade in the trenches optimizing massive supply chain logistics and enterprise data architectures for Fortune 500 companies like J&J and FedEx.</p>
              <p className="mt-6 text-white border-l-4 border-[#FF5F1F] pl-4 md:pl-6 font-bold">He represents the "Technical Node" of the constellation. By taking that enterprise-grade discipline and applying it to gaming, digital storytelling, and AI integration, his vision ensures that every system deployed is robust, scalable, and built for the future of play.</p>
            </div>

            <div className="border-t border-[#1a1a1a] pt-8 md:pt-10 mb-10 md:mb-12">
              <h3 className="text-white text-xl md:text-2xl font-black mb-6 md:mb-8 tracking-widest uppercase">Player Stats</h3>

              <div className="mb-8">
                 <p className="text-xs md:text-sm text-[#FF5F1F] font-black tracking-widest mb-2 uppercase">Main Quest</p>
                 <p className="text-gray-300 text-lg md:text-xl font-bold">Architecting enterprise-grade systems and forging the future of digital play.</p>
              </div>

              <div>
                 <p className="text-xs md:text-sm text-[#FF5F1F] font-black tracking-widest mb-4 uppercase">Skill Tree</p>
                 <ul className="flex flex-col gap-6">
                    <li className="flex items-start gap-4">
                       <div className="mt-1 text-[#FF5F1F] shrink-0"><Database className="w-5 h-5 md:w-6 md:h-6" /></div>
                       <div>
                          <strong className="text-white text-base md:text-lg block sm:inline">Data Architecture:</strong> <span className="text-gray-400 text-base md:text-lg sm:ml-2">Engineering scalable, high-fidelity data pipelines for complex ecosystems.</span>
                       </div>
                    </li>
                    <li className="flex items-start gap-4">
                       <div className="mt-1 text-[#FF5F1F] shrink-0"><Cpu className="w-5 h-5 md:w-6 md:h-6" /></div>
                       <div>
                          <strong className="text-white text-base md:text-lg block sm:inline">AI Orchestration:</strong> <span className="text-gray-400 text-base md:text-lg sm:ml-2">Leveraging generative AI as a force multiplier to accelerate technical deployment.</span>
                       </div>
                    </li>
                    <li className="flex items-start gap-4">
                       <div className="mt-1 text-[#FF5F1F] shrink-0"><Network className="w-5 h-5 md:w-6 md:h-6" /></div>
                       <div>
                          <strong className="text-white text-base md:text-lg block sm:inline">Systems Integration:</strong> <span className="text-gray-400 text-base md:text-lg sm:ml-2">Bridging the gap between raw metadata and compelling, user-centric platforms.</span>
                       </div>
                    </li>
                 </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 border-t border-[#1a1a1a] pt-8 md:pt-10">
              <a href="https://linkedin.com/in/jacobclovell" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 text-white font-black text-xs md:text-sm tracking-widest hover:text-[#FF5F1F] hover:border-[#555] transition-all bg-[#1a1a1a] border border-[#333] py-4 px-8 rounded-full uppercase w-full sm:w-auto">
                <LinkedInIcon size={20} /> LINKEDIN
              </a>
              <a href="mailto:hiro@primenexusdata.nexus" className="flex items-center justify-center gap-3 text-white font-black text-xs md:text-sm tracking-widest hover:text-[#FF5F1F] hover:border-[#555] transition-all bg-[#1a1a1a] border border-[#333] py-4 px-8 rounded-full uppercase w-full sm:w-auto">
                <Mail size={20} /> HIRO@PRIMENEXUSDATA.NEXUS
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: THE LIBRARIAN (EMILY) */}
      {/* ========================================== */}
      {showLibrarian && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center backdrop-blur-xl p-4 sm:p-6">
          <div className="bg-[#050505] border border-[#1a1a1a] w-full max-w-4xl max-h-[90vh] rounded-[2rem] sm:rounded-[3rem] relative overflow-y-auto p-8 sm:p-12 md:p-16">
            <div role="button" onClick={() => setShowLibrarian(false)} className="sticky top-0 float-right cursor-pointer text-gray-500 hover:text-white z-50 bg-black/50 md:bg-transparent backdrop-blur-md md:backdrop-blur-none rounded-full p-2 -mr-4 -mt-4 sm:-mr-8 sm:-mt-8">
              <X size={32} />
            </div>
            
            <div className="w-full h-[250px] sm:h-[350px] md:h-[450px] bg-[#0a0a0a] rounded-[1.5rem] md:rounded-[2rem] mb-8 md:mb-12 overflow-hidden border border-[#1a1a1a] mt-4 md:mt-0">
               <img src="/Emily_Profile.PNG" alt="Emily Lovell - The Librarian" className="w-full h-full object-cover object-top" />
            </div>

            <h2 className="text-5xl sm:text-6xl md:text-7xl font-black mb-2 tracking-tight uppercase">THE LIBRARIAN</h2>
            <p className="text-[#147abe] font-black tracking-widest text-xs md:text-sm mb-8 md:mb-12 uppercase">EMILY LOVELL // CO-FOUNDER & PARTNER</p>
            
            <div className="text-base md:text-lg text-gray-400 leading-relaxed font-medium mb-10 md:mb-12">
              <p>Every great quest requires a multi-class leader who can adapt to any challenge. The Librarian is the Nexus’s secret weapon.</p>
              <p className="mt-4 md:mt-6">Bringing a foundation and a career in librarianship, Emily possesses a deep understanding of community needs and a mastery of information delivery. She operates across all sectors of the business—from high-level strategy to the down-to-earth grind of building a startup.</p>
              <p className="mt-6 text-white border-l-4 border-[#147abe] pl-4 md:pl-6 font-bold">She represents the "Social Node" of the constellation, connecting our technical progress with the community we serve. Her ability to see the "big picture" ensures that as we level up our skills, we never lose sight of why we started: to bridge the gap between play and utility.</p>
            </div>

            <div className="border-t border-[#1a1a1a] pt-8 md:pt-10 mb-10 md:mb-12">
              <h3 className="text-white text-xl md:text-2xl font-black mb-6 md:mb-8 tracking-widest uppercase">Player Stats</h3>

              <div className="mb-8">
                 <p className="text-xs md:text-sm text-[#147abe] font-black tracking-widest mb-2 uppercase">Main Quest</p>
                 <p className="text-gray-300 text-lg md:text-xl font-bold">Sustaining the web and expanding the community.</p>
              </div>

              <div>
                 <p className="text-xs md:text-sm text-[#147abe] font-black tracking-widest mb-4 uppercase">Skill Tree</p>
                 <ul className="flex flex-col gap-6">
                    <li className="flex items-start gap-4">
                       <div className="mt-1 text-[#147abe] shrink-0"><BookOpen className="w-5 h-5 md:w-6 md:h-6" /></div>
                       <div>
                          <strong className="text-white text-base md:text-lg block sm:inline">Adaptability:</strong> <span className="text-gray-400 text-base md:text-lg sm:ml-2">Expert-level flexibility in startup operations.</span>
                       </div>
                    </li>
                    <li className="flex items-start gap-4">
                       <div className="mt-1 text-[#147abe] shrink-0"><Share2 className="w-5 h-5 md:w-6 md:h-6" /></div>
                       <div>
                          <strong className="text-white text-base md:text-lg block sm:inline">Strategic Partnership:</strong> <span className="text-gray-400 text-base md:text-lg sm:ml-2">Building the bridges that connect the Nexus to the world.</span>
                       </div>
                    </li>
                    <li className="flex items-start gap-4">
                       <div className="mt-1 text-[#147abe] shrink-0"><Users className="w-5 h-5 md:w-6 md:h-6" /></div>
                       <div>
                          <strong className="text-white text-base md:text-lg block sm:inline">Community Growth:</strong> <span className="text-gray-400 text-base md:text-lg sm:ml-2">Fostering the human element within our digital constellation.</span>
                       </div>
                    </li>
                 </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 border-t border-[#1a1a1a] pt-8 md:pt-10">
              <a href="" className="flex items-center justify-center sm:justify-start gap-3 text-white font-black text-xs md:text-sm tracking-widest hover:text-[#147abe] hover:border-[#555] transition-all bg-[#1a1a1a] border border-[#333] py-4 px-8 rounded-full uppercase w-full sm:w-auto">
                <Mail size={20} /> EMAIL
              </a>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
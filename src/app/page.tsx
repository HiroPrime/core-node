"use client";
import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, X, ArrowLeft, Target, Shield, Zap, Network, Radio, Mail, Link as LinkIcon, BookOpen, Share2, Users, Database, Cpu } from "lucide-react";

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
    const hasCompletedIntro = localStorage.getItem('nexus_intro_complete');
    if (hasCompletedIntro === 'true') {
      setStage(4);
    }
  }, []);

  const completeIntro = () => {
    localStorage.setItem('nexus_intro_complete', 'true');
    setStage(4);
  };

  const resetIntro = () => {
    localStorage.removeItem('nexus_intro_complete');
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

  // 2026 DESIGN TOKENS
  const massiveStoryText = {
    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
    fontWeight: '950',
    lineHeight: '1.1',
    color: 'white',
    letterSpacing: '-0.05em',
    maxWidth: '950px',
    margin: '0 auto',
    textAlign: 'center' as const
  };

  const primaryBtnStyle = {
    backgroundColor: 'white',
    color: 'black',
    padding: '24px 64px',
    borderRadius: '9999px',
    fontSize: '20px',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    boxShadow: '0 0 50px rgba(255,255,255,0.2)',
    marginTop: '60px',
    transition: 'all 0.3s'
  };

  const menuBtnStyle = {
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.25em',
    color: '#666',
    transition: 'color 0.3s'
  };

  if (!isMounted) return <div style={{backgroundColor: '#030303', height: '100vh'}} />;

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', width: '100vw', color: 'white', fontStyle: 'normal' }}>

      {/* ========================================== */}
      {/* STICKY HEADER SYSTEM */}
      {/* ========================================== */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100px',
        zIndex: 200,
        pointerEvents: 'none'
      }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '1400px', margin: '0 auto' }}>
          
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            top: stage === 0 ? '50vh' : '20px',
            marginTop: stage === 0 ? '-32px' : '0',
            pointerEvents: 'auto'
          }}>
            <div 
              onClick={() => stage === 0 && setStage(1)}
              className="core-node-pulse"
              style={{
                width: stage === 4 ? '22px' : '72px',
                height: stage === 4 ? '22px' : '72px',
                backgroundColor: 'white',
                borderRadius: '50%',
                cursor: stage === 0 ? 'pointer' : 'default',
                boxShadow: 'inset -4px -4px 12px rgba(0,0,0,0.5)'
              }}
            />
            <h1 style={{
              opacity: stage === 0 ? 0 : 1,
              fontSize: stage === 4 ? '18px' : '56px',
              fontWeight: 950,
              letterSpacing: '0.4em',
              marginTop: '10px'
            }}>NEXUS</h1>
          </div>

          {/* MAIN NAVIGATION BAR */}
          <div style={{
            position: 'absolute',
            right: '40px',
            top: '40px',
            display: 'flex',
            gap: '30px',
            opacity: stage === 4 ? 1 : 0,
            pointerEvents: stage === 4 ? 'auto' : 'none',
            transition: 'opacity 1s'
          }}>
            <button onClick={() => setShowCredo(true)} style={menuBtnStyle} className="hover:text-white">Credo</button>
            <button onClick={() => setShowArchitect(true)} style={menuBtnStyle} className="hover:text-white">Architect</button>
            <button onClick={() => setShowLibrarian(true)} style={menuBtnStyle} className="hover:text-white">Librarian</button>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* STORY STAGES (1-3) */}
      {/* ========================================== */}
      {stage > 0 && stage < 4 && (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '125px 20px 0 20px'
        }}>
          <div className="animate-in fade-in zoom-in-95 duration-700">
            {stage === 1 && (
              <>
                <p style={massiveStoryText}>The internet is vast, but we are connecting the dots. Every network starts with a single point. <span style={{color: '#FF5F1F'}}>Welcome to Core Node.</span></p>
                <div style={{textAlign: 'center'}}><button style={primaryBtnStyle} onClick={() => setStage(2)} className="hover:scale-105">Welcome to the Nexus</button></div>
              </>
            )}
            {stage === 2 && (
              <>
                <p style={massiveStoryText}>Nexus is a digital foundry. We don't just build isolated apps. <span style={{color: '#FF5F1F'}}>We build Nodes.</span></p>
                <div style={{display: 'flex', gap: '25px', justifyContent: 'center'}}>
                  <button style={{...primaryBtnStyle, backgroundColor: 'transparent', color: 'white', border: '2px solid #333', boxShadow: 'none'}} onClick={() => setStage(1)}>Back</button>
                  <button style={primaryBtnStyle} onClick={() => setStage(3)} className="hover:scale-105">What do you actually do?</button>
                </div>
              </>
            )}
            {stage === 3 && (
              <>
                <p style={massiveStoryText}>One node succeeds, it powers the next. Expanding our web of <span style={{color: '#FF5F1F'}}>gaming, AI, and storytelling.</span></p>
                <div style={{display: 'flex', gap: '25px', justifyContent: 'center'}}>
                  <button style={{...primaryBtnStyle, backgroundColor: 'transparent', color: 'white', border: '2px solid #333', boxShadow: 'none'}} onClick={() => setStage(2)}>Back</button>
                  <button style={{...primaryBtnStyle, backgroundColor: '#FF5F1F'}} onClick={completeIntro} className="hover:scale-105">Initialize System</button>
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
        <div className="animate-in fade-in duration-1000" style={{ paddingTop: '100px', paddingBottom: '120px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', padding: '0 30px' }}>
            
            <h2 style={{ 
              fontSize: 'clamp(4rem, 12vw, 10rem)', 
              fontWeight: 950, 
              letterSpacing: '-0.05em', 
              marginTop: '100px',
              marginBottom: '30px' 
            }}>SEASON 1.</h2>
            
            <div style={{ maxWidth: '650px', margin: '0 auto 100px auto', fontSize: '22px', color: '#777', lineHeight: '1.6', fontWeight: 600 }}>
              Establish the Core Node, power up flagship products, and earn experience points. Supporting nodes feeds energy back into the Core, unlocking new skills.
            </div>

            <h2 style={{ fontSize: '52px', fontWeight: 950, marginBottom: '80px', letterSpacing: '-0.03em' }}>EXPLORE THE NODES</h2>

            {/* NODE CAROUSEL */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '100px' }}>
              {nodeRegistry.map((node, i) => (
                <div key={node.id} onClick={() => setActiveNodeIndex(i)} style={{
                    width: '150px', height: '150px', borderRadius: '50%',
                    border: activeNodeIndex === i ? `4px solid ${node.color}` : '4px solid #151515',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)', 
                    boxShadow: activeNodeIndex === i ? `0 0 60px ${node.glow}` : 'none',
                    backgroundColor: '#080808', padding: '20px', textAlign: 'center',
                    transform: activeNodeIndex === i ? 'scale(1.15)' : 'scale(1)'
                  }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: activeNodeIndex === i ? 'white' : '#444', textTransform: 'uppercase', letterSpacing: '1.5px', lineHeight: '1.3' }}>
                    {activeNodeIndex === i ? (node.name === "Grimm Fracture" ? "Connecting Node" : node.name === "VOID" ? "Discovery Node" : "Active Connection") : node.name}
                  </span>
                </div>
              ))}
            </div>

            {/* NODE DETAILS CARD */}
            <div style={{ backgroundColor: '#070707', border: '1px solid #1a1a1a', padding: '70px', borderRadius: '50px', textAlign: 'left', maxWidth: '850px', margin: '0 auto', boxShadow: '0 50px 120px rgba(0,0,0,0.6)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                 <h3 style={{ fontSize: '56px', fontWeight: 950, letterSpacing: '-0.04em', margin: 0 }}>{activeNode.name}</h3>
                 <span style={{ fontSize: '11px', fontWeight: 900, color: activeNode.color, border: `1px solid ${activeNode.color}`, padding: '6px 16px', borderRadius: '99px', letterSpacing: '2px' }}>{activeNode.status}</span>
               </div>
               <p style={{ fontSize: '20px', color: '#999', lineHeight: '1.7', marginBottom: '50px', fontWeight: 500 }}>{activeNode.details}</p>
               {activeNode.link !== "#" && (
                 <a href={activeNode.link} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', color: 'black', padding: '20px 45px', borderRadius: '99px', fontWeight: 950, fontSize: '15px', textDecoration: 'none' }} className="hover:bg-[#FF5F1F] hover:text-white transition-all">
                   INITIALIZE UPLINK <ExternalLink size={18} />
                 </a>
               )}
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      {stage === 4 && (
        <footer style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 20px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333', fontSize: '11px', fontWeight: 900, letterSpacing: '3px' }}>
          <button onClick={resetIntro} style={{ color: '#555' }} className="hover:text-white transition-colors">View Opening</button>
          <span>NEXUS // SEASON 1 // 2026</span>
          <div style={{width: '150px'}}></div>
        </footer>
      )}

      {/* ========================================== */}
      {/* MODAL: CREDO */}
      {/* ========================================== */}
      {showCredo && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(40px)', padding: '20px' }}>
          <div style={{ backgroundColor: '#050505', border: '1px solid #1a1a1a', width: '100%', maxWidth: '950px', maxHeight: '85vh', borderRadius: '50px', position: 'relative', overflowY: 'auto', padding: '80px 60px' }}>
            <button onClick={() => setShowCredo(false)} style={{ position: 'sticky', top: '0', float: 'right', color: '#555', zIndex: 100, marginBottom: '-40px' }} className="hover:text-white"><X size={40}/></button>
            <h2 style={{ fontSize: '72px', fontWeight: 950, marginBottom: '10px', letterSpacing: '-0.05em' }}>CREDO.</h2>
            <p style={{ color: '#FF5F1F', fontWeight: 900, letterSpacing: '5px', fontSize: '14px', marginBottom: '60px' }}>CORE NODE PRINCIPLES</p>
            
            <div style={{ fontSize: '20px', color: '#888', lineHeight: '1.8', fontWeight: 500 }}>
              <p style={{ fontSize: '22px', color: 'white', fontWeight: 700, marginBottom: '60px' }}>The Nexus Credo: Core Node Principles</p>
              <p style={{ marginBottom: '60px' }}>At Nexus, our mission is to ignite the future of play and utility by building an interconnected web of digital nodes, fueled by AI and driven by data storytelling. This is the code we live by as we build the constellation:</p>
              
              <div style={{ marginBottom: '60px' }}>
                <h4 style={{ color: 'white', fontSize: '28px', fontWeight: 900, marginBottom: '15px' }}><Shield size={28} color="#FF5F1F" style={{marginRight: '15px', verticalAlign: 'middle'}} /> I. Architecture Over Ambiguity</h4>
                <p>We don’t just generate ideas; we architect the logic. Every node in the Nexus is built on a rock-solid foundation of enterprise-grade data architecture. Whether we are engineering automated SQL extraction pipelines or designing a scalable Star Schema for a TCG engine, we build for performance, fidelity, and scale.</p>
                <p style={{ marginTop: '15px', color: '#FF5F1F', fontWeight: 800, fontSize: '14px' }}>The Standard: 99.8% data fidelity isn't just for inventory; it’s the benchmark for every digital world we create.</p>
              </div>

              <div style={{ marginBottom: '60px' }}>
                <h4 style={{ color: 'white', fontSize: '28px', fontWeight: 900, marginBottom: '15px' }}><Target size={28} color="#FF5F1F" style={{marginRight: '15px', verticalAlign: 'middle'}} /> II. Storytelling is the Ultimate Data Filter</h4>
                <p>Complex data is a dark forest; our job is to light the path. We specialize in translating massive, disparate datasets into compelling, actionable stories for the user. We believe that whether you are an executive looking at a Power BI dashboard or a gamer navigating a sphere grid, the experience should be intuitive, visual, and user-centric.</p>
                <p style={{ marginTop: '15px', color: '#FF5F1F', fontWeight: 800, fontSize: '14px' }}>The Standard: Turn "massive and disparate" metadata into premium, high-performance digital experiences.</p>
              </div>

              <div style={{ marginBottom: '60px' }}>
                <h4 style={{ color: 'white', fontSize: '28px', fontWeight: 900, marginBottom: '15px' }}><Zap size={28} color="#FF5F1F" style={{marginRight: '15px', verticalAlign: 'middle'}} /> III. The AI Force Multiplier</h4>
                <p>We embrace the "virtual studio" model. We leverage Generative AI not as a shortcut, but as a force multiplier to innovate at speeds previously impossible for a solo builder. By orchestrating a suite of advanced AI tools, we redefine how rapidly high-quality visual IP and cohesive technical architectures can be scaled.</p>
                <p style={{ marginTop: '15px', color: '#FF5F1F', fontWeight: 800, fontSize: '14px' }}>The Standard: Move from initial brainstorming to final publication and deployment with the precision of an enterprise operations specialist.</p>
              </div>

              <div style={{ marginBottom: '60px' }}>
                <h4 style={{ color: 'white', fontSize: '28px', fontWeight: 900, marginBottom: '15px' }}><Network size={28} color="#FF5F1F" style={{marginRight: '15px', verticalAlign: 'middle'}} /> IV. Connections Build Constellations</h4>
                <p>No node exists in isolation. Our philosophy is rooted in the "interconnected web"—the belief that every product should power and inform the next. We bring a decade of experience in cross-functional leadership and project execution to ensure that every "season" of development adds a new, vibrant node to the Nexus.</p>
                <p style={{ marginTop: '15px', color: '#FF5F1F', fontWeight: 800, fontSize: '14px' }}>The Standard: Bridge the gap between technical rigor (M.A. in Game Development) and creative vision (Professional Design).</p>
              </div>

              <div style={{ marginBottom: '80px' }}>
                <h4 style={{ color: 'white', fontSize: '28px', fontWeight: 900, marginBottom: '15px' }}><Radio size={28} color="#FF5F1F" style={{marginRight: '15px', verticalAlign: 'middle'}} /> V. Build in Public, Level Up in Person</h4>
                <p>We are down-to-earth builders. We value the impact of the community and the experience points earned through real-world trial and error. We believe in a culture of data-driven workflows where we constantly level up our skills to become better builders for the future of play.</p>
                <p style={{ marginTop: '15px', color: '#FF5F1F', fontWeight: 800, fontSize: '14px' }}>The Standard: Leadership isn't just about the work we've done; it's about the work we are now empowered to do.</p>
              </div>

              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '40px', marginTop: '60px' }}>
                <h5 style={{ color: 'white', fontWeight: 900, fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '20px' }}>Current Season: Node Quest</h5>
                <p style={{fontSize: '15px', fontWeight: 900, margin: '5px 0'}}>Core Node Active: <span style={{color: '#FF5F1F'}}>corenode.nexus</span></p>
                <p style={{fontSize: '15px', fontWeight: 900, margin: '5px 0'}}>Primary Node Powering: <span style={{color: '#3b82f6'}}>primeportal.nexus</span></p>
                <p style={{fontSize: '15px', fontWeight: 900, margin: '5px 0'}}>Secondary Node Awakening: <span style={{color: '#ef4444'}}>grimmfracture.nexus</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: THE ARCHITECT (JACOB) */}
      {/* ========================================== */}
      {showArchitect && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(40px)', padding: '20px' }}>
          <div style={{ 
            backgroundColor: '#050505', 
            border: '1px solid #1a1a1a', 
            width: '100%', 
            maxWidth: '850px', 
            maxHeight: '90vh', 
            borderRadius: '60px', 
            position: 'relative', 
            padding: '80px 60px',
            overflowY: 'auto' 
          }}>
            <button 
              onClick={() => setShowArchitect(false)} 
              style={{ position: 'sticky', top: '-40px', float: 'right', color: '#555', zIndex: 100, marginBottom: '-40px' }}
              className="hover:text-white"
            >
              <X size={40}/>
            </button>
            
            <div style={{ width: '100%', height: '450px', backgroundColor: '#0a0a0a', borderRadius: '35px', marginBottom: '50px', overflow: 'hidden', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img src="/Jacob_Profile.png" alt="Jacob Lovell - The Architect" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <h2 style={{ fontSize: '64px', fontWeight: 950, marginBottom: '5px', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>THE ARCHITECT</h2>
            <p style={{ color: '#FF5F1F', fontWeight: 900, letterSpacing: '4px', fontSize: '14px', marginBottom: '40px', textTransform: 'uppercase' }}>JACOB LOVELL // FOUNDER & SOLO DEVELOPER</p>
            
            <div style={{ fontSize: '20px', color: '#999', lineHeight: '1.7', fontWeight: 500, marginBottom: '50px' }}>
              <p>Every digital constellation requires a strong foundation. The Architect provides the structural integrity of the Nexus.</p>
              <p style={{ marginTop: '25px' }}>A builder, gamer, and creative technologist, Jacob believes the best products are forged by those willing to get their hands dirty. He holds a Master's in Game Development, backed by a decade in the trenches optimizing massive supply chain logistics and enterprise data architectures for Fortune 500 companies like J&J and FedEx.</p>
              <p style={{ marginTop: '25px', color: 'white', borderLeft: '4px solid #FF5F1F', paddingLeft: '30px', fontWeight: 700 }}>He represents the "Technical Node" of the constellation. By taking that enterprise-grade discipline and applying it to gaming, digital storytelling, and AI integration, his vision ensures that every system deployed is robust, scalable, and built for the future of play.</p>
            </div>

            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '40px', marginBottom: '50px' }}>
              <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 950, marginBottom: '30px', letterSpacing: '2px', textTransform: 'uppercase' }}>Player Stats</h3>

              <div style={{ marginBottom: '30px' }}>
                 <p style={{ fontSize: '14px', color: '#FF5F1F', fontWeight: 900, letterSpacing: '2px', marginBottom: '5px', textTransform: 'uppercase' }}>Main Quest</p>
                 <p style={{ color: '#ccc', fontSize: '20px', fontWeight: 600 }}>Architecting enterprise-grade systems and forging the future of digital play.</p>
              </div>

              <div>
                 <p style={{ fontSize: '14px', color: '#FF5F1F', fontWeight: 900, letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>Skill Tree</p>

                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                       <div style={{ marginTop: '4px', color: '#FF5F1F' }}><Database size={24} /></div>
                       <div>
                          <strong style={{ color: 'white', fontSize: '18px' }}>Data Architecture:</strong> <span style={{ color: '#888', fontSize: '18px' }}>Engineering scalable, high-fidelity data pipelines for complex ecosystems.</span>
                       </div>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                       <div style={{ marginTop: '4px', color: '#FF5F1F' }}><Cpu size={24} /></div>
                       <div>
                          <strong style={{ color: 'white', fontSize: '18px' }}>AI Orchestration:</strong> <span style={{ color: '#888', fontSize: '18px' }}>Leveraging generative AI as a force multiplier to accelerate technical deployment.</span>
                       </div>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                       <div style={{ marginTop: '4px', color: '#FF5F1F' }}><Network size={24} /></div>
                       <div>
                          <strong style={{ color: 'white', fontSize: '18px' }}>Systems Integration:</strong> <span style={{ color: '#888', fontSize: '18px' }}>Bridging the gap between raw metadata and compelling, user-centric platforms.</span>
                       </div>
                    </li>
                 </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '40px', borderTop: '1px solid #1a1a1a', paddingTop: '40px' }}>
              <a href="https://linkedin.com/in/jacobclovell" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textDecoration: 'none', fontWeight: 950, fontSize: '14px' }} className="hover:text-[#FF5F1F]">
                <LinkedInIcon size={24} /> LINKEDIN
              </a>
              <a href="mailto:hiro@primenexusdata.nexus" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textDecoration: 'none', fontWeight: 950, fontSize: '14px' }} className="hover:text-[#FF5F1F]">
                <Mail size={24} /> HIRO@PRIMENEXUSDATA.NEXUS
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: THE LIBRARIAN (EMILY) */}
      {/* ========================================== */}
      {showLibrarian && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(40px)', padding: '20px' }}>
          <div style={{ 
            backgroundColor: '#050505', 
            border: '1px solid #1a1a1a', 
            width: '100%', 
            maxWidth: '850px', 
            maxHeight: '90vh', 
            borderRadius: '60px', 
            position: 'relative', 
            padding: '80px 60px',
            overflowY: 'auto' 
          }}>
            <button 
              onClick={() => setShowLibrarian(false)} 
              style={{ position: 'sticky', top: '-40px', float: 'right', color: '#555', zIndex: 100, marginBottom: '-40px' }}
              className="hover:text-white"
            >
              <X size={40}/>
            </button>
            
            <div style={{ width: '100%', height: '450px', backgroundColor: '#0a0a0a', borderRadius: '35px', marginBottom: '50px', overflow: 'hidden', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img src="/Emily_Profile.PNG" alt="Emily Lovell - The Librarian" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <h2 style={{ fontSize: '64px', fontWeight: 950, marginBottom: '5px', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>THE LIBRARIAN</h2>
            <p style={{ color: '#147abe', fontWeight: 900, letterSpacing: '4px', fontSize: '14px', marginBottom: '40px', textTransform: 'uppercase' }}>EMILY LOVELL // CO-FOUNDER & PARTNER</p>
            
            <div style={{ fontSize: '20px', color: '#999', lineHeight: '1.7', fontWeight: 500, marginBottom: '50px' }}>
              <p>Every great quest requires a multi-class leader who can adapt to any challenge. The Librarian is the Nexus’s secret weapon.</p>
              <p style={{ marginTop: '25px' }}>Bringing a foundation and a career in librarianship, Emily possesses a deep understanding of community needs and a mastery of information delivery. She operates across all sectors of the business—from high-level strategy to the down-to-earth grind of building a startup.</p>
              <p style={{ marginTop: '25px', color: 'white', borderLeft: '4px solid #147abe', paddingLeft: '30px', fontWeight: 700 }}>She represents the "Social Node" of the constellation, connecting our technical progress with the community we serve. Her ability to see the "big picture" ensures that as we level up our skills, we never lose sight of why we started: to bridge the gap between play and utility.</p>
            </div>

            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '40px', marginBottom: '50px' }}>
              <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 950, marginBottom: '30px', letterSpacing: '2px', textTransform: 'uppercase' }}>Player Stats</h3>

              <div style={{ marginBottom: '30px' }}>
                 <p style={{ fontSize: '14px', color: '#147abe', fontWeight: 900, letterSpacing: '2px', marginBottom: '5px', textTransform: 'uppercase' }}>Main Quest</p>
                 <p style={{ color: '#ccc', fontSize: '20px', fontWeight: 600 }}>Sustaining the web and expanding the community.</p>
              </div>

              <div>
                 <p style={{ fontSize: '14px', color: '#147abe', fontWeight: 900, letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>Skill Tree</p>

                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                       <div style={{ marginTop: '4px', color: '#147abe' }}><BookOpen size={24} /></div>
                       <div>
                          <strong style={{ color: 'white', fontSize: '18px' }}>Adaptability:</strong> <span style={{ color: '#888', fontSize: '18px' }}>Expert-level flexibility in startup operations.</span>
                       </div>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                       <div style={{ marginTop: '4px', color: '#147abe' }}><Share2 size={24} /></div>
                       <div>
                          <strong style={{ color: 'white', fontSize: '18px' }}>Strategic Partnership:</strong> <span style={{ color: '#888', fontSize: '18px' }}>Building the bridges that connect the Nexus to the world.</span>
                       </div>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                       <div style={{ marginTop: '4px', color: '#147abe' }}><Users size={24} /></div>
                       <div>
                          <strong style={{ color: 'white', fontSize: '18px' }}>Community Growth:</strong> <span style={{ color: '#888', fontSize: '18px' }}>Fostering the human element within our digital constellation.</span>
                       </div>
                    </li>
                 </ul>
              </div>
            </div>

            
          </div>
        </div>
      )}

    </main>
  );
}
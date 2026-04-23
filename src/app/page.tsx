"use client";
import { Network, Hexagon, Cpu, Shield, Sparkles, ArrowRight, ExternalLink, Terminal } from "lucide-react";

export default function CoreNode() {
  return (
    <main className="min-h-screen p-6 md:p-12 font-sans selection:bg-[var(--nexus-orange)] selection:text-white pb-24">
      
      {/* 🛡️ TOP NAVIGATION */}
      <nav className="max-w-6xl mx-auto flex justify-between items-center mb-20 animate-in fade-in slide-in-from-top-8 duration-700">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-10 h-10 border border-[var(--nexus-orange)] bg-[var(--nexus-orange-glow)] rounded-lg flex items-center justify-center shadow-[0_0_15px_var(--nexus-orange-glow)] transition-all duration-500 group-hover:scale-110">
            <Hexagon className="w-5 h-5 text-[var(--nexus-orange)]" />
          </div>
          <span className="font-bold text-xl tracking-widest uppercase">Core<span className="text-[var(--text-muted)]">Node</span></span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[var(--text-muted)] bg-[var(--glass-panel)] px-4 py-2 rounded-full border border-[var(--glass-border)]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          System Online
        </div>
      </nav>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT COLUMN: THE LORE */}
        <div className="lg:col-span-7 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <div className="inline-flex items-center gap-2 text-[var(--nexus-orange)] font-mono text-xs uppercase tracking-widest mb-6 bg-[var(--nexus-orange-glow)] border border-[var(--nexus-orange)]/30 px-3 py-1.5 rounded-full w-fit">
            <Network className="w-3.5 h-3.5" /> Welcome to the Nexus
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">
            We are connecting <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--nexus-orange)] to-orange-300">the dots.</span>
          </h1>

          <div className="space-y-6 text-[var(--text-muted)] text-base md:text-lg leading-relaxed max-w-2xl">
            <p>
              The internet is vast. Every massive network, every constellation, and every sprawling spider web starts with a single, central point. You've just found ours. Welcome to Core Node.
            </p>
            <p className="bg-[var(--glass-panel)] p-5 border-l-2 border-[var(--nexus-orange)] rounded-r-xl">
              <strong className="text-white">Nexus is a digital foundry and a living ecosystem.</strong> We don't just build isolated apps. We build Nodes. Think of a massive sphere grid in your favorite RPG: a single node pulses with energy, reaching out through the dark to find the next connection, lighting it up, and unlocking entirely new paths.
            </p>
            <p>
              As one node succeeds, it powers the next, expanding our web of gaming, AI, and digital storytelling tools.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: SEASON 1 & NODES */}
        <div className="lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-500 fill-mode-both">
          
          {/* Season 1 Banner */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-[var(--glass-border-hover)] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--nexus-orange)] opacity-10 blur-3xl rounded-full"></div>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-[var(--nexus-orange)]" />
              <h2 className="font-bold text-xl uppercase tracking-widest">Season 1</h2>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">First Light & Discovery</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
              Our current quest is foundational: establish the Core Node, power up our flagship products, and earn the XP needed to level up the Nexus.
            </p>
          </div>

          {/* Product Node: Prime Portal */}
          <a href="https://primeportal.nexus" target="_blank" rel="noopener noreferrer" className="block bg-[var(--glass-panel)] hover:bg-white/5 border border-[var(--glass-border)] hover:border-[var(--nexus-orange)]/50 rounded-2xl p-6 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-white group-hover:text-[var(--nexus-orange)] transition-colors flex items-center gap-2">
                Prime Portal <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <span className="text-[9px] font-mono border border-[var(--nexus-orange)] text-[var(--nexus-orange)] px-2 py-0.5 rounded uppercase tracking-widest">Active</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Our flagship node. A high-performance analytics and arbitrage platform built for the competitive TCG community. Bridges complex game metadata with real-time market action.
            </p>
          </a>

          {/* Product Node: Grim Fracture */}
          <a href="#" className="block bg-[var(--glass-panel)] hover:bg-white/5 border border-[var(--glass-border)] hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                Grim Fracture <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <span className="text-[9px] font-mono border border-purple-500 text-purple-400 px-2 py-0.5 rounded uppercase tracking-widest">Deploying</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              The creative node. A dark fantasy digital IP and comic based on public domain Fables, pushing the boundaries of what AI-driven visual storytelling can achieve.
            </p>
          </a>

        </div>
      </div>

      {/* BOTTOM SECTION: THE ARCHITECT */}
      <div className="max-w-6xl mx-auto mt-24 pt-12 border-t border-[var(--glass-border)] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700 fill-mode-both">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">About the Architect</h2>
            <h3 className="text-[var(--nexus-orange)] font-mono text-sm tracking-widest uppercase mb-6">Jacob Lovell | Founder & Solo Dev</h3>
            <div className="space-y-4 text-sm md:text-base text-[var(--text-muted)] leading-relaxed">
              <p>
                I am a builder, a gamer, and a creative technologist. I believe the best products are built by people who aren't afraid to get their hands dirty and do the actual work.
              </p>
              <p>
                I hold a Master's in Game Development, but I've spent a decade in the trenches optimizing massive supply chain logistics and enterprise data architectures for Fortune 500 companies like J&J and FedEx.
              </p>
              <p className="text-white border-l-2 border-[var(--glass-border)] pl-4">
                I am taking that enterprise-grade discipline and applying it to the things I actually love: gaming, digital storytelling, and AI integration.
              </p>
              <p>
                Let's build the future of play together.
              </p>
            </div>
          </div>
          <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-8 font-mono text-xs md:text-sm text-[var(--text-muted)] shadow-2xl">
            <div className="flex items-center gap-2 mb-4 border-b border-[var(--glass-border)] pb-4">
              <Terminal className="w-4 h-4 text-[var(--nexus-orange)]" />
              <span className="uppercase tracking-widest">System_Log_01</span>
            </div>
            <div className="space-y-2 opacity-80">
              <p><span className="text-green-400">root@nexus:~$</span> initialize_founder_profile</p>
              <p className="pl-4 text-white">&gt; Loading hybrid background...</p>
              <p className="pl-4 text-white">&gt; Arch: Game Dev + Enterprise Logistics</p>
              <p className="pl-4 text-white">&gt; Status: Building in public</p>
              <p className="pl-4 text-white">&gt; Objective: Connect the next node.</p>
              <p className="animate-pulse text-[var(--nexus-orange)] mt-4">_</p>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
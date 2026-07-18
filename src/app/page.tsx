/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from "lucide-react";

// GAME CONSTANTS
const BOUNDARY = 4000; 
const FRICTION = 0.96;
const ACCEL = 0.6;
const MAX_SPEED = 12;
// Former full zoom-out is the standard view; zoom in/out from there.
const DEFAULT_ZOOM = 0.25;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 1.75;
const ZOOM_SENSITIVITY = 0.0015;

type NodeStatus = 'hidden' | 'faint' | 'anomaly' | 'powered';
type FlightMode = 'mouse' | 'keyboard';

interface NodeData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  glow: string;
  statusText: string;
  level: number;
  exp: number;
  statusState: NodeStatus; 
  clicks: number;
  requiredClicks: number;
  imageLayers: string[];
  userHasClicked: boolean;
  exploreUrl: string;
}

// FULL GRID ONLINE: All nodes powered with Core constellation links active.
const INITIAL_NODES: NodeData[] = [
  { id: 'core', name: 'Core Node', x: 0, y: 0, color: '#FF5F1F', glow: 'rgba(255,95,31,0.5)', statusText: 'CENTRAL NODE', level: 19, exp: 0, statusState: 'powered', clicks: 0, requiredClicks: 3, imageLayers: ['/planets/core-planet.png'], userHasClicked: false, exploreUrl: 'https://corenode.nexus/planet' },
  { id: 'prime', name: 'Prime Portal', x: -1600, y: -1200, color: '#3b82f6', glow: 'rgba(59,130,246,0.5)', statusText: 'TCG ANALYTICS', level: 34, exp: 0, statusState: 'powered', clicks: 0, requiredClicks: 3, imageLayers: ['/planets/prime-planet.png'], userHasClicked: false, exploreUrl: 'https://primeportal.nexus' },
  { id: 'grimm', name: 'Grimm Fracture', x: 2000, y: -600, color: '#ef4444', glow: 'rgba(239,68,68,0.5)', statusText: 'AI GENERATIVE WEB COMIC', level: 6, exp: 0, statusState: 'powered', clicks: 0, requiredClicks: 3, imageLayers: ['/planets/grimm-planet.png'], userHasClicked: false, exploreUrl: 'https://grimmfracture.nexus' },
  { id: 'shipyard', name: 'Nexus Prime', x: -800, y: 2400, color: '#a855f7', glow: 'rgba(168,85,247,0.5)', statusText: 'LIVE', level: 15, exp: 0, statusState: 'powered', clicks: 0, requiredClicks: 3, imageLayers: ['/planets/shipyard-planet.png'], userHasClicked: false, exploreUrl: 'https://nexusprime.nexus' },
  { id: 'savepoint', name: 'Save Point', x: 1600, y: 1400, color: '#FF00FF', glow: 'rgba(255,0,255,0.5)', statusText: 'FREE ARCADE (RETRO)', level: 4, exp: 0, statusState: 'powered', clicks: 0, requiredClicks: 3, imageLayers: ['/planets/savepoint-planet.png'], userHasClicked: false, exploreUrl: 'https://savepoint.nexus' },
];

const CONNECTIONS: { from: string; to: string }[] = [
  { from: 'core', to: 'prime' },
  { from: 'core', to: 'grimm' },
  { from: 'core', to: 'shipyard' },
  { from: 'core', to: 'savepoint' },
];

export default function ConstellationGrid() {
  const [isMounted, setIsMounted] = useState(false);
  const [gridNodes, setGridNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [activeNode, setActiveNode] = useState<NodeData | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [dexMessage, setDexMessage] = useState<string | null>(null);

  // PHYSICS & FLIGHT STATE
  const shipPos = useRef({ x: 0, y: 0 });
  const shipVel = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const shipAngle = useRef(0);
  const flightMode = useRef<FlightMode>('mouse');
  const activeKeys = useRef({ up: false, down: false, left: false, right: false });
  const requestRef = useRef<number>(0);
  const zoomRef = useRef(DEFAULT_ZOOM);
  
  const nodesRef = useRef(gridNodes);
  useEffect(() => {
    nodesRef.current = gridNodes;
  }, [gridNodes]);

  // Pull live Population from each site's public /api/stats (via Core aggregator)
  useEffect(() => {
    let cancelled = false;

    const pullPopulation = async () => {
      try {
        const res = await fetch('/api/population');
        if (!res.ok) return;
        const data = await res.json() as {
          nodes?: Record<string, { population?: number; metric?: string | null; ok?: boolean }>;
        };
        if (cancelled || !data.nodes) return;

        setGridNodes(prev => prev.map(node => {
          const stats = data.nodes?.[node.id];
          if (!stats?.ok || typeof stats.population !== 'number') return node;
          return { ...node, exp: stats.population };
        }));
      } catch {
        // Keep last known values if a site is unreachable
      }
    };

    pullPopulation();
    const interval = setInterval(pullPopulation, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // DOM REFS
  const worldRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);

    // ==========================================
    // BOOT-LOADER FRAGMENT LOGIC
    // ==========================================
    let dexTimeout: ReturnType<typeof setTimeout>;
    const broadcastDexFragment = () => {
      const coreNode = nodesRef.current.find(n => n.id === 'core');
      if (coreNode && coreNode.statusState === 'powered') return;

      const transmissions = [
        "S-sys... boot...",
        "Architect... acknowledged...",
        "Power at 2%... critical...",
        "Need... three sparks... to ignite...",
        "The void... so dark...",
        "[ ERR_FRAG_MISSING ]",
        "Route power... to the Core..."
      ];

      const msg = transmissions[Math.floor(Math.random() * transmissions.length)];
      setDexMessage(msg);
      
      setTimeout(() => setDexMessage(null), 4000);

      const nextTime = Math.random() * 15000 + 10000;
      dexTimeout = setTimeout(broadcastDexFragment, nextTime);
    };
    
    dexTimeout = setTimeout(broadcastDexFragment, 5000);

    // MANUAL FLIGHT & SYSTEM OVERRIDES
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (['w', 'arrowup'].includes(key)) activeKeys.current.up = true;
      if (['s', 'arrowdown'].includes(key)) activeKeys.current.down = true;
      if (['a', 'arrowleft'].includes(key)) activeKeys.current.left = true;
      if (['d', 'arrowright'].includes(key)) activeKeys.current.right = true;

      if (e.ctrlKey && e.shiftKey && key === 'e') {
        setGridNodes(prev => prev.map(n => 
          n.id === 'core' && n.statusState === 'hidden' ? { ...n, statusState: 'faint' } : n
        ));
      }
      if (e.ctrlKey && e.shiftKey && key === 'p') {
        setGridNodes(prev => prev.map(n => ({ ...n, statusState: 'powered' })));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'arrowup'].includes(key)) activeKeys.current.up = false;
      if (['s', 'arrowdown'].includes(key)) activeKeys.current.down = false;
      if (['a', 'arrowleft'].includes(key)) activeKeys.current.left = false;
      if (['d', 'arrowright'].includes(key)) activeKeys.current.right = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const nextZoom = zoomRef.current * Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
      zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    // PHYSICS LOOP
    const updatePhysics = () => {
      let currentAction = 'idle';
      const zoom = zoomRef.current;
      // Zoomed in → slower; zoomed out → faster travel
      const speedScale = Math.min(2.5, Math.max(0.35, DEFAULT_ZOOM / zoom));
      const accel = ACCEL * speedScale;
      const maxSpeed = MAX_SPEED * speedScale;

      const k = activeKeys.current;
      const isKeyboardActive = k.up || k.down || k.left || k.right;

      if (isKeyboardActive) flightMode.current = 'keyboard';

      if (flightMode.current === 'keyboard') {
        if (isKeyboardActive) {
          let kx = 0;
          let ky = 0;
          if (k.up) ky -= 1;
          if (k.down) ky += 1;
          if (k.left) kx -= 1;
          if (k.right) kx += 1;

          const inputDist = Math.sqrt(kx * kx + ky * ky);
          if (inputDist > 0) {
            const ax = (kx / inputDist) * accel;
            const ay = (ky / inputDist) * accel;
            shipVel.current.x += ax;
            shipVel.current.y += ay;

            const targetAngle = Math.atan2(ky, kx) * (180 / Math.PI) + 90;
            let angleDiff = targetAngle - shipAngle.current;
            angleDiff = ((angleDiff + 180) % 360 + 360) % 360 - 180;
            
            shipAngle.current += angleDiff * 0.25;

            if (angleDiff > 6) currentAction = 'bank-right';
            else if (angleDiff < -6) currentAction = 'bank-left';
            else currentAction = 'thrust';
          }
        }
        
        shipVel.current.x *= FRICTION;
        shipVel.current.y *= FRICTION;
        targetPos.current = { x: shipPos.current.x, y: shipPos.current.y };

      } else {
        const dx = targetPos.current.x - shipPos.current.x;
        const dy = targetPos.current.y - shipPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
          const speedFactor = Math.min(1, distance / 100);
          const ax = (dx / distance) * accel * speedFactor;
          const ay = (dy / distance) * accel * speedFactor;
          shipVel.current.x += ax;
          shipVel.current.y += ay;

          const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          let angleDiff = targetAngle - shipAngle.current;
          angleDiff = ((angleDiff + 180) % 360 + 360) % 360 - 180;
          
          if (distance > 30) {
            shipAngle.current += angleDiff * 0.25;
            if (angleDiff > 6) currentAction = 'bank-right'; 
            else if (angleDiff < -6) currentAction = 'bank-left';  
            else currentAction = 'thrust';     
          }

          let activeFriction = FRICTION;
          if (distance < 80) activeFriction = 0.70; 
          else if (Math.abs(angleDiff) > 45) activeFriction = 0.85; 

          shipVel.current.x *= activeFriction;
          shipVel.current.y *= activeFriction;
          
        } else {
          shipVel.current.x = 0;
          shipVel.current.y = 0;
          shipPos.current.x = targetPos.current.x;
          shipPos.current.y = targetPos.current.y;
        }
      }

      const speed = Math.sqrt(shipVel.current.x ** 2 + shipVel.current.y ** 2);
      if (speed > maxSpeed) {
        shipVel.current.x = (shipVel.current.x / speed) * maxSpeed;
        shipVel.current.y = (shipVel.current.y / speed) * maxSpeed;
      }

      let nextX = shipPos.current.x + shipVel.current.x;
      let nextY = shipPos.current.y + shipVel.current.y;

      if (Math.abs(nextX) > BOUNDARY || Math.abs(nextY) > BOUNDARY) {
        setWarning("APEX QUARANTINE ZONE: ACCESS DENIED");
        shipVel.current.x *= -1.5;
        shipVel.current.y *= -1.5;
        nextX = Math.max(-BOUNDARY, Math.min(BOUNDARY, nextX));
        nextY = Math.max(-BOUNDARY, Math.min(BOUNDARY, nextY));
        targetPos.current = { x: nextX, y: nextY };
        
        setTimeout(() => setWarning(null), 3000);
      }

      shipPos.current = { x: nextX, y: nextY };

      let closestNode = null;
      for (const node of nodesRef.current) {
        if (node.statusState === 'hidden') continue;

        const nodeRadius = node.statusState === 'powered' ? (96 + (node.level * 16)) / 2 : (48 + (node.level * 16)) / 2; 
        const dist = Math.sqrt((node.x - shipPos.current.x)**2 + (node.y - shipPos.current.y)**2);
        if (dist < nodeRadius + 150) {
          closestNode = node;
          break;
        }
      }
      setActiveNode(closestNode);

      // RENDER TRANSFORMS — scale world around the ship; vessel stays screen-fixed
      if (worldRef.current) {
        worldRef.current.style.transform = `scale(${zoom}) translate(${-shipPos.current.x}px, ${-shipPos.current.y}px)`;
      }
      if (bgRef.current) {
        bgRef.current.style.backgroundPosition = `${-shipPos.current.x * 0.5 * zoom}px ${-shipPos.current.y * 0.5 * zoom}px`;
        bgRef.current.style.transform = `scale(${1 + (1 - zoom) * 0.15})`;
      }
      
      if (shipRef.current) {
        shipRef.current.style.rotate = `${shipAngle.current}deg`;
        shipRef.current.setAttribute('data-action', currentAction); 
      }

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
    
    return () => {
      cancelAnimationFrame(requestRef.current!);
      clearTimeout(dexTimeout);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleMapClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.hud-element')) return;

    flightMode.current = 'mouse';

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const zoom = zoomRef.current;
    
    targetPos.current = {
      x: shipPos.current.x + (e.clientX - screenCenterX) / zoom,
      y: shipPos.current.y + (e.clientY - screenCenterY) / zoom
    };
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    const clickedNode = gridNodes.find(n => n.id === nodeId);
    if (!clickedNode) return;

    flightMode.current = 'mouse';
    targetPos.current = { x: clickedNode.x, y: clickedNode.y };

    if (clickedNode.statusState === 'faint') {
      if (clickedNode.userHasClicked) return;

      setGridNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
          const newClicks = n.clicks + 1;
          
          if (newClicks >= n.requiredClicks) {
            return { ...n, clicks: newClicks, statusState: 'anomaly', userHasClicked: true };
          }
          return { ...n, clicks: newClicks, userHasClicked: true };
        }
        return n;
      }));
    }
  };

  if (!isMounted) return <div className="bg-[#030303] h-screen w-screen" />;

  return (
    <main className="bg-[#030303] h-screen w-screen overflow-hidden text-white font-sans selection:bg-[#FF5F1F] selection:text-white relative cursor-crosshair" onClick={handleMapClick}>
      
      <div className="absolute inset-0 w-full h-full">
        
        {/* INFINITE PARALLAX BACKGROUND */}
        <div ref={bgRef} className="absolute inset-0 parallax-bg opacity-30 pointer-events-none scale-[1.05]" />

        {/* THE WORLD CONTAINER */}
        <div className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none">
          <div ref={worldRef} className="absolute w-0 h-0 transition-none will-change-transform">
            
            {/* CONSTELLATION CONNECTIONS */}
            <svg
              className="absolute overflow-visible pointer-events-none"
              style={{ left: 0, top: 0, width: 1, height: 1 }}
            >
              {CONNECTIONS.map(({ from, to }) => {
                const fromNode = gridNodes.find(n => n.id === from);
                const toNode = gridNodes.find(n => n.id === to);
                if (!fromNode || !toNode) return null;
                if (fromNode.statusState === 'hidden' || toNode.statusState === 'hidden') return null;
                if (fromNode.statusState !== 'powered' || toNode.statusState !== 'powered') return null;

                return (
                  <line
                    key={`${from}-${to}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={fromNode.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.35"
                    strokeDasharray="6 10"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="0.2;0.55;0.2"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </line>
                );
              })}
            </svg>

            {/* RENDER NODES */}
            {gridNodes.map((node) => {
              if (node.statusState === 'hidden') return null;

              const isFaint = node.statusState === 'faint';
              const isAnomaly = node.statusState === 'anomaly';
              const isPowered = node.statusState === 'powered';

              const physicalSize = isPowered ? 96 + (node.level * 16) : 48 + (node.level * 16); 
              
              let bgColor = '#f4f4f5';
              let borderColor = 'rgba(255,255,255,0.8)';
              let boxShadow = `0 0 ${20 + (node.level * 10)}px ${node.glow}, inset 0 0 15px ${node.glow}`;
              let bgImage = 'none';

              if (isFaint) {
                bgColor = 'transparent';
                borderColor = node.color;
                boxShadow = `0 0 15px ${node.glow}`;
              } else if (isAnomaly) {
                bgColor = 'transparent';
                borderColor = node.color;
                boxShadow = 'none'; 
                bgImage = `repeating-linear-gradient(45deg, ${node.color} 0, ${node.color} 1px, transparent 1px, transparent 10px)`;
              } else if (isPowered) {
                bgColor = '#030303'; 
                borderColor = 'transparent';
                boxShadow = `
                  inset -16px -16px 24px rgba(0,0,0,0.8),
                  inset 4px 4px 10px rgba(255,255,255,0.3),
                  0 0 ${20 + (node.level * 10)}px ${node.glow}
                `;
              }

              return (
                <div 
                  key={node.id}
                  className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-700
                    ${activeNode?.id === node.id ? 'scale-110 z-20' : 'scale-100 z-10'}
                    ${isFaint && !node.userHasClicked ? 'opacity-40 hover:opacity-80' : 'opacity-100'}
                  `}
                  style={{ left: node.x, top: node.y }}
                >
                  {/* Planet Container */}
                  <div 
                    className={`rounded-full border flex items-center justify-center pointer-events-auto ${isFaint && node.userHasClicked ? 'cursor-default' : 'cursor-help'} relative overflow-hidden transition-all duration-300`}
                    style={{ 
                      width: `${physicalSize}px`,
                      height: `${physicalSize}px`,
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      boxShadow: boxShadow,
                      backgroundImage: bgImage
                    }}
                    onClick={(e) => handleNodeClick(e, node.id)}
                  >
                    {isPowered && node.imageLayers && node.imageLayers.map((layerPath, index) => (
                      <div 
                        key={index}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                          backgroundImage: `url(${layerPath})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          zIndex: index + 1,
                          mixBlendMode: 'screen'
                        }}
                      />
                    ))}
                    
                    {isPowered && <div className="absolute inset-0 rounded-full shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.6)] pointer-events-none z-50" />}
                  </div>

                  {/* TETHERING FEEDBACK UI */}
                  {isFaint && (
                    <div className={`absolute top-[120%] whitespace-nowrap bg-black/80 border border-white/10 px-3 py-1 rounded text-[8px] md:text-[10px] font-black uppercase tracking-widest pointer-events-none ${node.userHasClicked ? 'text-gray-400' : 'text-[#FF5F1F] animate-pulse'}`}>
                      {node.userHasClicked ? 'SIGNATURE VERIFIED' : 'AWAITING SIGNATURES'} : [ {node.clicks.toLocaleString()} / {node.requiredClicks.toLocaleString()} ]
                    </div>
                  )}
                </div>
              );
            })}

            {/* APEX QUARANTINE BOUNDARY VISUALIZER */}
            <div 
              className="absolute border-4 border-red-900/30 border-dashed pointer-events-none"
              style={{ 
                left: -BOUNDARY, top: -BOUNDARY, 
                width: BOUNDARY * 2, height: BOUNDARY * 2 
              }}
            />
          </div>
        </div>

        {/* THE ARCHITECT'S VESSEL */}
        <div 
          ref={shipRef}
          className="absolute top-1/2 left-1/2 w-12 h-12 pointer-events-none transition-none will-change-transform z-30 vessel-container flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
          data-action="idle" 
        >
          <div className="thruster-exhaust absolute bottom-2 w-2 h-0 bg-gradient-to-t from-transparent via-[#FF5F1F] to-white rounded-full blur-[2px] transition-all duration-100 origin-top translate-y-full z-0" />
          <img 
            src="/vessel.png" 
            alt="Architect Vessel" 
            className="ship-sprite relative z-10 w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,95,31,0.5)] transition-transform duration-200 ease-out" 
            style={{ color: 'transparent' }} 
          />
        </div>

        {/* VESSEL KINETIC CSS ENGINE */}
        <style dangerouslySetInnerHTML={{__html: `
          .vessel-container[data-action="idle"] .ship-sprite { transform: perspective(300px) rotateY(0deg) scale(1); }
          .vessel-container[data-action="thrust"] .ship-sprite { transform: perspective(300px) rotateY(0deg) scaleY(1.08) scaleX(0.95); }
          .vessel-container[data-action="bank-left"] .ship-sprite { transform: perspective(300px) rotateY(-45deg) rotateZ(-10deg); }
          .vessel-container[data-action="bank-right"] .ship-sprite { transform: perspective(300px) rotateY(45deg) rotateZ(10deg); }

          .vessel-container[data-action="thrust"] .thruster-exhaust { 
            height: 28px; 
            opacity: 1; 
            animation: thrusterPulse 0.1s infinite alternate; 
          }
          .vessel-container[data-action="idle"] .thruster-exhaust { 
            height: 0px; 
            opacity: 0; 
          }
          .vessel-container[data-action="bank-left"] .thruster-exhaust { 
            height: 14px; 
            opacity: 0.8; 
            transform: translateY(100%) translateX(4px) rotate(-15deg); 
          }
          .vessel-container[data-action="bank-right"] .thruster-exhaust { 
            height: 14px; 
            opacity: 0.8; 
            transform: translateY(100%) translateX(-4px) rotate(15deg); 
          }

          @keyframes thrusterPulse {
            from { box-shadow: 0 0 10px 2px rgba(255, 95, 31, 0.6); }
            to { box-shadow: 0 0 20px 6px rgba(255, 95, 31, 1); }
          }
        `}} />

        {/* ========================================== */}
        {/* UI HUD */}
        {/* ========================================== */}

        <div className={`hud-element absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 transition-all duration-700 pointer-events-none ${activeNode && activeNode.statusState !== 'faint' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {activeNode && activeNode.statusState !== 'faint' && (
            <div 
              className="bg-[#050505]/95 backdrop-blur-2xl border p-6 md:p-8 rounded-[2rem] shadow-2xl pointer-events-auto flex flex-col justify-center items-center text-center gap-2"
              style={{ borderColor: activeNode.color, boxShadow: `0 20px 50px ${activeNode.glow}` }}
            >
              {activeNode.statusState === 'anomaly' ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: activeNode.color }}>ANOMALY DETECTED</p>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-300">[ UNKNOWN ENTITY ]</h2>
                  <p className="text-gray-500 text-xs md:text-sm font-medium tracking-wide mt-2 animate-pulse">Scanning for Node signature...</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: activeNode.color }}>TARGET LOCKED</p>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight">{activeNode.name}</h2>
                  <p className="text-gray-400 text-xs md:text-sm font-medium tracking-wide mt-2">STATUS: {activeNode.statusText}</p>

                  <div className="flex gap-4 mt-4 w-full pt-4 border-t border-white/10">
                    <div className="flex-1 bg-black/50 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                      <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">Mass</p>
                      <p className="text-2xl font-black" style={{ color: activeNode.color }}>{activeNode.level}</p>
                    </div>
                    {/* Population HUD hidden while /api/stats wiring is in progress */}
                  </div>

                  <a
                    href={activeNode.exploreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: activeNode.color,
                      color: '#050505',
                      boxShadow: `0 0 24px ${activeNode.glow}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Explore <ExternalLink size={16} />
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {/* Anonymous Fragment Transmissions */}
        {dexMessage && (
          <div className="hud-element absolute bottom-32 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full max-w-sm px-6 transition-opacity duration-500 opacity-100">
            <div className="bg-black/80 border-2 border-dashed border-[#FF5F1F]/50 p-3 md:p-4 rounded backdrop-blur-sm shadow-[0_0_15px_rgba(255,95,31,0.2)] text-center">
              <p className="dex-warning text-[#FF5F1F] text-xs md:text-sm font-bold uppercase tracking-widest font-mono m-0 leading-tight">
                {dexMessage}
              </p>
            </div>
          </div>
        )}

        {/* Quarantine Warnings */}
        {warning && (
          <div className="hud-element absolute inset-0 z-[150] pointer-events-none flex items-center justify-center bg-red-900/10">
            <div className="bg-black border-4 border-red-600 p-6 md:p-10 shadow-[0_0_30px_rgba(239,68,68,0.8)]">
              <p className="dex-warning text-red-500 text-xl md:text-3xl font-bold uppercase tracking-widest text-center font-mono">
                {warning}
              </p>
            </div>
          </div>
        )}
      
      </div>
    </main>
  );
}
/**
 * The Nodes — the Grid.
 *
 * Single source of truth for every project on the site, so the Press Start screen,
 * the Node select, the briefings and the Stack can never disagree with each other.
 * Copy follows content/lore.md. Voice rules: mixed case, capitalize what matters,
 * short, spoken.
 */

export type NodeStatus = "LIVE" | "STANDING" | "BENCHED";

export interface NodeBrief {
  /** What it is. One or two sentences, spoken. */
  what: string;
  /** The stack, in world-language first, real name in parens. */
  stack: string[];
  /** The pieces that actually do the work. */
  pieces: string[];
  /** Who it is for. */
  audience: string;
}

export interface UniverseNode {
  id: string;
  name: string;
  /** Its name inside the world. */
  title: string;
  status: NodeStatus;
  statusText: string;
  color: string;
  glow: string;
  /** Mass on the select screen. */
  mass: number;
  planet: string;
  /** null for the Core — it has no product, it has a person. */
  exploreUrl: string | null;
  /** Position on the constellation plane. */
  x: number;
  y: number;
  brief: NodeBrief;
}

export const NODES: UniverseNode[] = [
  {
    id: "core",
    name: "Core Node",
    title: "the Core",
    status: "LIVE",
    statusText: "CENTRAL NODE",
    color: "#FF5F1F",
    glow: "rgba(255,95,31,0.5)",
    mass: 19,
    planet: "/planets/core-planet.png",
    exploreUrl: null,
    x: 0,
    y: 0,
    brief: {
      what: "The central hub. Where the Grid is mapped and where the Operator sits. This world has no product. It has a person.",
      stack: ["Next 16 (The Wire)", "React 19", "Supabase (The Ledger)", "Tailwind 4 (The Skin)"],
      pieces: [
        "The Press Start screen — the front door.",
        "The Node select — the whole Grid on one plane.",
        "The Stack — what the house is actually built out of.",
      ],
      audience: "Anyone who wants to know who built the rest of it.",
    },
  },
  {
    id: "savepoint",
    name: "Save Point",
    title: "the Identity Studio",
    status: "LIVE",
    statusText: "IDENTITY STUDIO",
    color: "#FF00FF",
    glow: "rgba(255,0,255,0.5)",
    mass: 4,
    planet: "/planets/prime-planet2.png",
    exploreUrl: "https://savepoint.nexus",
    x: 1600,
    y: 1400,
    brief: {
      what: "Where a Character gets made. You get a First Look — cinematic on top, T-pose underneath — and from that one body every later page is cut.",
      stack: [
        "Next 15.5",
        "React 18",
        "Supabase (The Ledger)",
        "Stripe (The Toll)",
        "Resend (The Messenger)",
        "Sharp (The Cut)",
        "ComfyUI 8188 (The Furnace)",
        "Ollama (The Home Brains)",
      ],
      pieces: [
        "Qwen-Image-Edit-2511 — The Painter. Faces, bodies, every cut.",
        "Haiku — The Scribe. Writes words. Never touches a pixel.",
        "The Rig — ControlNet, InstantX, Multiple-Angles, LoRAs. Keeps a Character looking like the same Character.",
        "One page at a time. My grade before anything moves.",
      ],
      audience:
        "Anyone who wants a character that is actually theirs. Gamers, TTRPG players, and creators who need one body that stays consistent.",
    },
  },

  {
    id: "prime",
    name: "Prime Portal",
    title: "the Observatory",
    status: "LIVE",
    statusText: "TCG ANALYTICS",
    color: "#2ee6d6",
    glow: "rgba(46,230,214,0.5)",
    mass: 34,
    planet: "/planets/prime-planet.png",
    exploreUrl: "https://primeportal.nexus",
    x: -1600,
    y: -1200,
    brief: {
      what: "TCG analytics. Pokemon, search, and the analytics beast. A deck that reads itself. The other half of the desk, and live as a product — which is not the same as done.",
      stack: [
        "Next 16.1",
        "React 19.2",
        "Recharts 3.8 (the scrying glass)",
        "Supabase (The Ledger)",
        "Tailwind 4 (The Skin)",
      ],
      pieces: [
        "Search across the card space.",
        "Recharts views — the scrying glass. Trend, compare, read a deck back to you.",
        "Supabase holding everything the house remembers.",
      ],
      audience:
        "Collectors and competitive players who would rather look at the numbers than guess.",
    },
  },
  {
    id: "grimm",
    name: "Grimm Fracture",
    title: "the dark world",
    status: "BENCHED",
    statusText: "AI GENERATIVE WEB COMIC",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.5)",
    mass: 6,
    planet: "/planets/grimm-planet.png",
    exploreUrl: null,
    x: 2000,
    y: -600,
    brief: {
      what: "AI generative web comic. The files stay on the shelf. The Node is cold and it is not on the desk. It is not gone, it is resting.",
      stack: ["The Furnace", "The Painter", "The Scribe"],
      pieces: [
        "Pages generated the same way Save Point cuts them.",
        "Parked, on purpose. One page at a time still applies.",
      ],
      audience: "Nobody yet. That is the point of benched.",
    },
  },
  {
    id: "shipyard",
    name: "Nexus Prime",
    title: "the holding bay",
    status: "STANDING",
    statusText: "HOLDING BAY",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.5)",
    mass: 15,
    planet: "/planets/shipyard-planet.png",
    exploreUrl: "https://nexusprime.nexus",
    x: -800,
    y: 2400,
    brief: {
      what: "Quiet. Left standing. Not the desk.",
      stack: ["Design archive"],
      pieces: ["Marks, banners, and layout studies that earned their keep."],
      audience: "The house it belongs to.",
    },
  },
];

/** What talks to what. Decoration is not allowed. */
export const CONNECTIONS: { from: string; to: string }[] = [
  { from: "core", to: "prime" },
  { from: "core", to: "savepoint" },
  { from: "core", to: "grimm" },
  { from: "core", to: "shipyard" },
];

export const STATUS_LABEL: Record<NodeStatus, string> = {
  LIVE: "Live",
  STANDING: "Standing",
  BENCHED: "Benched",
};

export function getNode(id: string): UniverseNode | undefined {
  return NODES.find((node) => node.id === id);
}

/**
 * Only these two are on the Level Select. The other Nodes exist in the world and
 * have briefings, but the select screen is a door, not an index — so it shows
 * what a visitor can actually walk into.
 */
export const SELECT_SPOTS: { id: string; x: number; y: number }[] = [
  { id: "prime", x: -470, y: -30 },
  { id: "savepoint", x: 470, y: 30 },
];

/** The manifesto page. Sourced straight from content/lore.md — no invented facts. */
export interface ManifestoSection {
  heading: string;
  lines: string[];
}

export const MANIFESTO: ManifestoSection[] = [
  {
    heading: "The premise",
    lines: [
      "The Nexus is not a portfolio. It is a machine that builds itself, one Node at a time, and a person at the center of it who mostly talks.",
      "I don't sit down and type a spec. I talk, the machine listens, and the page comes out looking like the thing I already had in my head. That is the whole method.",
      "The Core is me. Core Node is not a company. It is the one surface that is allowed to be only me.",
    ],
  },
  {
    heading: "The method",
    lines: [
      "Speech in, products out. I talk more than I type. Every word I have ever sent this machine started as my voice.",
      "I am a product designer first and a developer second, and I am proud that I code by talking.",
    ],
  },
  {
    heading: "Why I do what I do",
    lines: [
      "Because the expensive part of building was never the code. It was getting the thing in my head into the world without losing it on the way through.",
      "Local iron, my own models, my own taste. No cloud permission slip, no bill that changes the decision. Free until it Works, then Break the Server, Flood the Queue, and put her to work.",
      "Every Node is something I built. Some are live. Some are benched. All of them are mine.",
    ],
  },
];


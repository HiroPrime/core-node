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
  /** The pieces that actually do the work. Optional — a Node can show what it is learning instead. */
  pieces?: string[];
  /** What the Node is teaching me right now. */
  learning?: string[];
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
  /**
   * How the select screen stages the planet image. "card", "memory" and
   * "cover" are physical objects — a promo card, a memory card, a comic
   * cover — shown as floating 3D slabs on the stage (full-bleed art needs no
   * cutout). Anything without this stays in the round glass orb.
   */
  artifact?: "card" | "memory" | "cover";
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
    title: "",
    status: "LIVE",
    statusText: "Character Consistency",
    color: "#FF00FF",
    glow: "rgba(255,0,255,0.5)",
    mass: 4,
    planet: "/planets/savepoint-memcard.png",
    artifact: "memory",
    exploreUrl: "https://savepoint.nexus",
    x: 1600,
    y: 1400,
    brief: {
      what: "Where a Character gets made. You talk it through with a bot — who they are, what they look like — and the conversation turns into the first A-pose. Character consistency first, to open up any number of worlds that need a character.",
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
      learning: [
        "Local UI — the whole pipeline runs on my own machine.",
        "Image generation — getting past prompting.",
        "Which AI is best for what task.",
        "Building new tools almost every day.",
      ],
      audience:
        "Anyone who wants a character that is actually theirs. Gamers, TTRPG players, and creators who need one body that stays consistent.",
    },
  },

  {
    id: "prime",
    name: "Prime Portal",
    title: "",
    status: "LIVE",
    statusText: "TCG Search and Data Club",
    color: "#2ee6d6",
    glow: "rgba(46,230,214,0.5)",
    mass: 34,
    planet: "/planets/prime-portal-card.png",
    artifact: "card",
    exploreUrl: "https://primeportal.nexus",
    x: -1600,
    y: -1200,
    brief: {
      what: "TCG and data club. Gundam right now — Pokemon and One Piece are coming. A light search engine for fans and arbitragers first; the heavy analytics are the endgame. The point is simple: pull a card up fast, without going to Google.",
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
      learning: [
        "Search consistency — the same card, the same answer, every time.",
        "How people actually pull a card up — watching real searches.",
        "Supabase and APIs — the data layer under it all.",
      ],
      audience:
        "Collectors, competitive players, and arbitragers — anyone who would rather look at the numbers than guess.",
    },
  },
  {
    id: "grimm",
    name: "Grimm Fracture",
    title: "",
    status: "BENCHED",
    statusText: "AI GENERATIVE WEB COMIC",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.5)",
    mass: 6,
    planet: "/nodes/grimm-fracture-comic.jpg",
    artifact: "cover",
    exploreUrl: null,
    x: 2000,
    y: -600,
    brief: {
      what: "A creative endeavor to uncover the consistency needed to build an entire 60-issue comic book series — AI assisting on story writing, development, and art.",
      stack: ["AI", "BasicHiro (the brain)"],
      learning: [
        "Character consistency — the thing everything else hangs on.",
        "Image generation — turnarounds and character development.",
        "AI writing — story and development.",
        "Layout automation. Not working yet, but it is on the list.",
      ],
      audience: "My dark fantasy comic book fans.",
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
 * The doors on the Level Select. The live Nodes are walk-ins; Grimm Fracture is
 * benched but its door is left open on purpose — people can still walk in and
 * read what it is. The rest of the Grid has briefings but no door: the select
 * screen is a door, not an index.
 */
export const SELECT_SPOTS: { id: string; x: number; y: number }[] = [
  { id: "prime", x: -470, y: -30 },
  { id: "savepoint", x: 470, y: 30 },
  { id: "grimm", x: 0, y: -470 },
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
      "The expensive part of building was never the code. It was getting the thing in my head into the world without losing it on the way through.",
      "I am a product designer first and a developer second, and I am proud that I code by talking.",
    ],
  },
  {
    heading: "The pattern",
    lines: [
      "Every Node starts the same way: something I needed, something I thought would be cool, a build that happens because I want it to exist.",
      "Then the realization, every time: the thing I built is not just for me. It is a tool. I have ADHD — long projects slip through my hands, builds hold. Other creators don't have that problem. They finish what they start.",
      "So the tool becomes the product. I build the tool. You build the project.",
    ],
  },
  {
    heading: "Save Point",
    lines: [
      "Save Point is the one I am most excited about, because it is driven by the work I actually love: Character creation and Character consistency.",
      "If character art was never your strong point, it stops being the wall. You talk the Character through — one conversation — and she stays the same person across poses, pages, and projects.",
      "That is the trade I want with the world: creators get the ability to create, even where it was never their strength — and it comes out high quality anyway.",
    ],
  },
  {
    heading: "The honesty rule",
    lines: [
      "If it is not working — or not where it is supposed to be — I should not be charging for it. You don't sell a broken car and stay quiet about the broken part.",
      "So the tools go out free while they grow, and the people using them direct where development goes next. More users in, better tools out. Fair all the way around.",
    ],
  },
  {
    heading: "The miles",
    lines: [
      "None of this runs on luck. The tools are the ones I have lived in: Comfy and Ollama on my own iron — no cloud permission slip — VS Code and Cline in every session, Cursor, Gemini, and every online image platform worth the try.",
      "That mileage is the job. I know where the holes are because I have fallen into most of them — and a hole in a workflow is a product waiting to happen.",
      "What is exciting about my work: I build the tool I wish existed, and then other creators take it places I will never go.",
    ],
  },
  {
    heading: "The Nodes",
    lines: [
      "Every Node is something I built. Some are live. Some are benched. All of them are mine.",
    ],
  },
];

